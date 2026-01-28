import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryService } from '../manufacturer-inventory/manufacturer-inventory.service';
import { NotificationService } from '../notification/notification.service';
import {
  CreateReturnDto,
  ResolveReturnDto,
  ReturnResponseDto,
} from './dto/return.dto';
import { ReturnStatus, NotificationType } from '@prisma/client';

@Injectable()
export class ReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly manufacturerInventory: ManufacturerInventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a return request
   * RETAILER ONLY
   */
  async create(dto: CreateReturnDto, retailerId: string): Promise<ReturnResponseDto> {
    // Validate manufacturer exists
    const manufacturer = await this.prisma.user.findUnique({
      where: { id: dto.manufacturerId, role: 'MANUFACTURER', isActive: true },
    });

    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }

    // Validate GRN if provided
    if (dto.grnId) {
      const grn = await this.prisma.gRN.findUnique({
        where: { id: dto.grnId },
      });

      if (!grn) {
        throw new NotFoundException('GRN not found');
      }

      if (grn.retailerId !== retailerId) {
        throw new ForbiddenException('GRN does not belong to you');
      }
    }

    // Validate items
    for (const item of dto.items) {
      const material = await this.prisma.material.findUnique({
        where: { id: item.materialId },
      });

      if (!material) {
        throw new NotFoundException(`Material ${item.materialId} not found`);
      }

      if ((item.packets || 0) === 0 && (item.looseUnits || 0) === 0) {
        throw new BadRequestException(
          `At least one of packets or looseUnits must be positive for material ${material.name}`,
        );
      }
    }

    // Generate return number
    const returnNumber = await this.sequenceService.getNextNumber('RET');

    // Create return
    const returnRecord = await this.prisma.return.create({
      data: {
        returnNumber,
        retailerId,
        manufacturerId: dto.manufacturerId,
        grnId: dto.grnId,
        reason: dto.reason,
        reasonDetails: dto.reasonDetails,
        status: ReturnStatus.RAISED,
        items: {
          create: dto.items.map(item => ({
            materialId: item.materialId,
            packets: item.packets || 0,
            looseUnits: item.looseUnits || 0,
          })),
        },
      },
      include: {
        retailer: { select: { name: true } },
        manufacturer: { select: { name: true } },
        grn: { select: { grnNumber: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
    });

    // Notify Admin and Manufacturer
    const adminIds = await this.notificationService.getAdminUserIds();
    const retailer = await this.prisma.user.findUnique({
      where: { id: retailerId },
      select: { name: true },
    });

    await this.notificationService.createForMultipleUsers(
      [...adminIds, dto.manufacturerId],
      NotificationType.RETURN_RAISED,
      'New Return Request',
      `Return ${returnNumber} raised by ${retailer?.name} for ${dto.reason.replace('_', ' ').toLowerCase()}`,
      returnRecord.id,
    );

    return this.mapToResponse(returnRecord);
  }

  /**
   * Resolve a return
   * ADMIN ONLY
   */
  async resolve(
    id: string,
    dto: ResolveReturnDto,
    adminId: string,
  ): Promise<ReturnResponseDto> {
    const returnRecord = await this.prisma.return.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
        retailer: { select: { name: true } },
        manufacturer: { select: { name: true } },
      },
    });

    if (!returnRecord) {
      throw new NotFoundException('Return not found');
    }

    if (returnRecord.status !== ReturnStatus.RAISED && returnRecord.status !== ReturnStatus.UNDER_REVIEW) {
      throw new BadRequestException('Return already resolved');
    }

    // Map resolution to status
    const statusMap: Record<string, ReturnStatus> = {
      'APPROVED_RESTOCK': ReturnStatus.APPROVED_RESTOCK,
      'APPROVED_REPLACE': ReturnStatus.APPROVED_REPLACE,
      'REJECTED': ReturnStatus.REJECTED,
    };

    const newStatus = statusMap[dto.resolution];

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update return status
      await tx.return.update({
        where: { id },
        data: {
          status: newStatus,
          resolvedAt: new Date(),
          resolvedBy: adminId,
          resolutionNotes: dto.resolutionNotes,
        },
      });

      // If APPROVED_RESTOCK, add back to manufacturer inventory
      if (dto.resolution === 'APPROVED_RESTOCK') {
        for (const item of returnRecord.items) {
          if (item.packets > 0 || item.looseUnits > 0) {
            await this.manufacturerInventory.restockFromReturn(
              item.materialId,
              returnRecord.manufacturerId,
              item.packets,
              item.looseUnits,
              adminId,
              id,
              tx,
            );
          }
        }
      }
    });

    // Notify retailer
    await this.notificationService.create(
      returnRecord.retailerId,
      NotificationType.RETURN_RESOLVED,
      'Return Resolved',
      `Your return ${returnRecord.returnNumber} has been ${dto.resolution.replace('_', ' ').toLowerCase()}`,
      id,
    );

    return this.findOne(id);
  }

  /**
   * Update return status to UNDER_REVIEW
   * ADMIN ONLY
   */
  async markUnderReview(id: string): Promise<ReturnResponseDto> {
    const returnRecord = await this.prisma.return.findUnique({
      where: { id },
    });

    if (!returnRecord) {
      throw new NotFoundException('Return not found');
    }

    if (returnRecord.status !== ReturnStatus.RAISED) {
      throw new BadRequestException('Return is not in RAISED status');
    }

    await this.prisma.return.update({
      where: { id },
      data: { status: ReturnStatus.UNDER_REVIEW },
    });

    return this.findOne(id);
  }

  /**
   * Get return by ID
   */
  async findOne(id: string): Promise<ReturnResponseDto> {
    const returnRecord = await this.prisma.return.findUnique({
      where: { id },
      include: {
        retailer: { select: { name: true } },
        manufacturer: { select: { name: true } },
        grn: { select: { grnNumber: true } },
        resolver: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
    });

    if (!returnRecord) {
      throw new NotFoundException('Return not found');
    }

    return this.mapToResponse(returnRecord);
  }

  /**
   * Get returns by retailer
   */
  async findByRetailer(
    retailerId: string,
    status?: ReturnStatus,
  ): Promise<ReturnResponseDto[]> {
    const where: any = { retailerId };
    if (status) {
      where.status = status;
    }

    const returns = await this.prisma.return.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        manufacturer: { select: { name: true } },
        grn: { select: { grnNumber: true } },
        resolver: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return returns.map(r => this.mapToResponse(r));
  }

  /**
   * Get returns by manufacturer
   */
  async findByManufacturer(
    manufacturerId: string,
    status?: ReturnStatus,
  ): Promise<ReturnResponseDto[]> {
    const where: any = { manufacturerId };
    if (status) {
      where.status = status;
    }

    const returns = await this.prisma.return.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        manufacturer: { select: { name: true } },
        grn: { select: { grnNumber: true } },
        resolver: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return returns.map(r => this.mapToResponse(r));
  }

  /**
   * Get all returns (Admin)
   */
  async findAll(status?: ReturnStatus): Promise<ReturnResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const returns = await this.prisma.return.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        manufacturer: { select: { name: true } },
        grn: { select: { grnNumber: true } },
        resolver: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return returns.map(r => this.mapToResponse(r));
  }

  /**
   * Get pending returns count
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.return.count({
      where: {
        status: { in: [ReturnStatus.RAISED, ReturnStatus.UNDER_REVIEW] },
      },
    });
  }

  /**
   * Map to response DTO
   */
  private mapToResponse(returnRecord: any): ReturnResponseDto {
    return {
      id: returnRecord.id,
      returnNumber: returnRecord.returnNumber,
      retailerId: returnRecord.retailerId,
      retailerName: returnRecord.retailer?.name || '',
      manufacturerId: returnRecord.manufacturerId,
      manufacturerName: returnRecord.manufacturer?.name || '',
      grnId: returnRecord.grnId,
      grnNumber: returnRecord.grn?.grnNumber,
      status: returnRecord.status,
      reason: returnRecord.reason,
      reasonDetails: returnRecord.reasonDetails,
      items: returnRecord.items.map((item: any) => ({
        id: item.id,
        materialId: item.materialId,
        materialName: item.material?.name || '',
        sqCode: item.material?.sqCode || '',
        packets: item.packets,
        looseUnits: item.looseUnits,
      })),
      createdAt: returnRecord.createdAt,
      resolvedAt: returnRecord.resolvedAt,
      resolvedBy: returnRecord.resolvedBy,
      resolverName: returnRecord.resolver?.name,
      resolutionNotes: returnRecord.resolutionNotes,
    };
  }
}