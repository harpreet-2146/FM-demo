import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryService } from '../manufacturer-inventory/manufacturer-inventory.service';
import { CreateSRNDto, ApproveSRNDto, SRNResponseDto, SRNItemResponseDto } from './dto/srn.dto';
import { SRNStatus } from '@prisma/client';

@Injectable()
export class SRNService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly manufacturerInventory: ManufacturerInventoryService,
  ) {}

  /**
   * Create a new SRN (draft)
   * RETAILER ONLY
   */
  async create(dto: CreateSRNDto, retailerId: string): Promise<SRNResponseDto> {
    // Validate all materials exist and are active
    const materialIds = dto.items.map(i => i.materialId);
    const uniqueIds = [...new Set(materialIds)];

    if (uniqueIds.length !== dto.items.length) {
      throw new BadRequestException('Duplicate materials in request');
    }

    const materials = await this.prisma.material.findMany({
      where: { id: { in: uniqueIds }, isActive: true },
    });

    if (materials.length !== uniqueIds.length) {
      throw new BadRequestException('One or more materials not found or inactive');
    }

    // Generate SRN number
    const srnNumber = await this.sequenceService.getNextNumber('SRN');

    // Create SRN with items
    const srn = await this.prisma.sRN.create({
      data: {
        srnNumber,
        retailerId,
        status: SRNStatus.DRAFT,
        items: {
          create: dto.items.map(item => ({
            materialId: item.materialId,
            requestedPackets: item.requestedPackets,
          })),
        },
      },
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
      },
    });

    return this.mapToResponse(srn);
  }

  /**
   * Submit SRN for approval
   * RETAILER ONLY
   */
  async submit(id: string, retailerId: string): Promise<SRNResponseDto> {
    const srn = await this.findOneEntity(id);

    if (srn.retailerId !== retailerId) {
      throw new ForbiddenException('Can only submit your own SRNs');
    }

    if (srn.status !== SRNStatus.DRAFT) {
      throw new BadRequestException('Can only submit SRNs in DRAFT status');
    }

    const updated = await this.prisma.sRN.update({
      where: { id },
      data: {
        status: SRNStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Process SRN approval
   * ADMIN ONLY
   */
  async processApproval(
    id: string,
    dto: ApproveSRNDto,
    adminId: string,
  ): Promise<SRNResponseDto> {
    const srn = await this.findOneEntity(id);

    if (srn.status !== SRNStatus.SUBMITTED) {
      throw new BadRequestException('Can only process SUBMITTED SRNs');
    }

    if (dto.action === 'REJECTED') {
      return this.reject(srn, dto.rejectionNote || 'No reason provided', adminId);
    }

    // For APPROVED or PARTIAL, validate items and block inventory
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Items required for approval');
    }

    return this.approve(srn, dto, adminId);
  }

  /**
   * Approve SRN (full or partial)
   */
  private async approve(
    srn: any,
    dto: ApproveSRNDto,
    adminId: string,
  ): Promise<SRNResponseDto> {
    const manufacturerId = dto.manufacturerId;

    // Validate manufacturer exists
    const manufacturer = await this.prisma.user.findUnique({
      where: { id: manufacturerId, role: 'MANUFACTURER', isActive: true },
    });

    if (!manufacturer) {
      throw new BadRequestException('Invalid or inactive manufacturer');
    }

    // Build approval map
    const approvalMap = new Map<string, number>();
    for (const item of dto.items!) {
      approvalMap.set(item.materialId, item.approvedPackets);
    }

    // Validate all items are in the SRN
    for (const item of srn.items) {
      if (!approvalMap.has(item.materialId)) {
        throw new BadRequestException(`Missing approval for material ${item.materialId}`);
      }

      const approved = approvalMap.get(item.materialId)!;
      if (approved < 0) {
        throw new BadRequestException('Approved packets cannot be negative');
      }
      if (approved > item.requestedPackets) {
        throw new BadRequestException(
          `Approved packets (${approved}) cannot exceed requested (${item.requestedPackets})`,
        );
      }

      // Check inventory availability
      const available = await this.manufacturerInventory.getAvailablePackets(
        item.materialId,
        manufacturerId,
      );

      if (available < approved) {
        throw new BadRequestException(
          `Insufficient inventory for ${item.material.name}. Available: ${available}, Requested: ${approved}`,
        );
      }
    }

    // Determine status
    let allApproved = true;
    let anyApproved = false;
    for (const item of srn.items) {
      const approved = approvalMap.get(item.materialId)!;
      if (approved < item.requestedPackets) allApproved = false;
      if (approved > 0) anyApproved = true;
    }

    const newStatus = allApproved ? SRNStatus.APPROVED : SRNStatus.PARTIAL;

    if (!anyApproved) {
      throw new BadRequestException('At least one item must be approved');
    }

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update SRN status
      await tx.sRN.update({
        where: { id: srn.id },
        data: {
          status: newStatus,
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      });

      // Update items and block inventory
      for (const item of srn.items) {
        const approved = approvalMap.get(item.materialId)!;

        await tx.sRNItem.update({
          where: { id: item.id },
          data: { approvedPackets: approved },
        });

        if (approved > 0) {
          await this.manufacturerInventory.blockForDispatch(
            item.materialId,
            manufacturerId,
            approved,
            adminId,
            srn.id,
            tx,
          );
        }
      }
    });

    return this.findOne(srn.id);
  }

  /**
   * Reject SRN
   */
  private async reject(
    srn: any,
    rejectionNote: string,
    adminId: string,
  ): Promise<SRNResponseDto> {
    await this.prisma.sRN.update({
      where: { id: srn.id },
      data: {
        status: SRNStatus.REJECTED,
        rejectedAt: new Date(),
        approvedBy: adminId,
        rejectionNote,
      },
    });

    return this.findOne(srn.id);
  }

  /**
   * Get SRN by ID
   */
  async findOne(id: string): Promise<SRNResponseDto> {
    const srn = await this.findOneEntity(id);
    return this.mapToResponse(srn);
  }

  /**
   * Get raw entity
   */
  private async findOneEntity(id: string) {
    const srn = await this.prisma.sRN.findUnique({
      where: { id },
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        approver: { select: { name: true } },
      },
    });

    if (!srn) {
      throw new NotFoundException('SRN not found');
    }

    return srn;
  }

  /**
   * Get SRNs for retailer
   */
  async findByRetailer(retailerId: string, status?: SRNStatus): Promise<SRNResponseDto[]> {
    const where: any = { retailerId };
    if (status) {
      where.status = status;
    }

    const srns = await this.prisma.sRN.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return srns.map(s => this.mapToResponse(s));
  }

  /**
   * Get all SRNs (Admin)
   */
  async findAll(status?: SRNStatus): Promise<SRNResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const srns = await this.prisma.sRN.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return srns.map(s => this.mapToResponse(s));
  }

  /**
   * Get pending SRNs count
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.sRN.count({
      where: { status: SRNStatus.SUBMITTED },
    });
  }

  /**
   * Map to response DTO
   */
  private mapToResponse(srn: any): SRNResponseDto {
    return {
      id: srn.id,
      srnNumber: srn.srnNumber,
      retailerId: srn.retailerId,
      retailerName: srn.retailer?.name || '',
      status: srn.status,
      items: srn.items.map((item: any): SRNItemResponseDto => ({
        id: item.id,
        materialId: item.materialId,
        materialName: item.material?.name || '',
        requestedPackets: item.requestedPackets,
        approvedPackets: item.approvedPackets,
      })),
      createdAt: srn.createdAt,
      submittedAt: srn.submittedAt,
      approvedAt: srn.approvedAt,
      rejectedAt: srn.rejectedAt,
      approvedBy: srn.approvedBy,
      approverName: srn.approver?.name,
      rejectionNote: srn.rejectionNote,
    };
  }
}