import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryService } from '../manufacturer-inventory/manufacturer-inventory.service';
import { AssignmentService } from '../assignment/assignment.service';
import { NotificationService } from '../notification/notification.service';
import { CreateSRNDto, ApproveSRNDto, SRNResponseDto, SRNItemResponseDto } from './dto/srn.dto';
import { SRNStatus, NotificationType } from '@prisma/client';

@Injectable()
export class SRNService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly manufacturerInventory: ManufacturerInventoryService,
    private readonly assignmentService: AssignmentService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new SRN (draft)
   * RETAILER ONLY
   */
  async create(dto: CreateSRNDto, retailerId: string): Promise<SRNResponseDto> {
    // Validate manufacturer assignment
    const isAssigned = await this.assignmentService.isAssigned(retailerId, dto.manufacturerId);
    if (!isAssigned) {
      throw new ForbiddenException(
        'You are not assigned to this manufacturer. Contact Admin to get assigned.',
      );
    }

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

    // Validate each item has at least packets or loose units
    for (const item of dto.items) {
      if ((item.requestedPackets || 0) === 0 && (item.requestedLooseUnits || 0) === 0) {
        throw new BadRequestException(
          'Each item must have at least packets or loose units requested',
        );
      }
    }

    // Generate SRN number
    const srnNumber = await this.sequenceService.getNextNumber('SRN');

    // Create SRN with items
    const srn = await this.prisma.sRN.create({
      data: {
        srnNumber,
        retailerId,
        manufacturerId: dto.manufacturerId,
        status: SRNStatus.DRAFT,
        items: {
          create: dto.items.map(item => ({
            materialId: item.materialId,
            requestedPackets: item.requestedPackets || 0,
            requestedLooseUnits: item.requestedLooseUnits || 0,
          })),
        },
      },
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
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
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
    });

    // Notify admins
    const adminIds = await this.notificationService.getAdminUserIds();
    await this.notificationService.createForMultipleUsers(
      adminIds,
      NotificationType.SRN_SUBMITTED,
      'New SRN Submitted',
      `SRN ${updated.srnNumber} submitted by ${updated.retailer?.name}`,
      id,
    );

    return this.mapToResponse(updated);
  }

  /**
   * Process SRN approval
   * ADMIN ONLY
   * Inventory is blocked ONLY at approval time
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

    if (!srn.manufacturerId) {
      throw new BadRequestException('SRN has no manufacturer assigned');
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
   * Inventory blocking happens HERE
   */
  private async approve(
    srn: any,
    dto: ApproveSRNDto,
    adminId: string,
  ): Promise<SRNResponseDto> {
    const manufacturerId = srn.manufacturerId!;

    // Build approval map
    const approvalMap = new Map<string, { packets: number; looseUnits: number }>();
    for (const item of dto.items!) {
      approvalMap.set(item.materialId, {
        packets: item.approvedPackets || 0,
        looseUnits: item.approvedLooseUnits || 0,
      });
    }

    // Validate all items are in the SRN
    for (const item of srn.items) {
      if (!approvalMap.has(item.materialId)) {
        throw new BadRequestException(`Missing approval for material ${item.materialId}`);
      }

      const approved = approvalMap.get(item.materialId)!;
      
      if (approved.packets < 0 || approved.looseUnits < 0) {
        throw new BadRequestException('Approved quantities cannot be negative');
      }
      
      if (approved.packets > item.requestedPackets) {
        throw new BadRequestException(
          `Approved packets (${approved.packets}) cannot exceed requested (${item.requestedPackets})`,
        );
      }

      if (approved.looseUnits > item.requestedLooseUnits) {
        throw new BadRequestException(
          `Approved loose units (${approved.looseUnits}) cannot exceed requested (${item.requestedLooseUnits})`,
        );
      }

      // Check inventory availability
      const available = await this.manufacturerInventory.getAvailable(
        item.materialId,
        manufacturerId,
      );

      if (available.packets < approved.packets) {
        throw new BadRequestException(
          `Insufficient packets for ${item.material.name}. Available: ${available.packets}, Requested: ${approved.packets}`,
        );
      }

      if (available.looseUnits < approved.looseUnits) {
        throw new BadRequestException(
          `Insufficient loose units for ${item.material.name}. Available: ${available.looseUnits}, Requested: ${approved.looseUnits}`,
        );
      }
    }

    // Determine status
    let allApproved = true;
    let anyApproved = false;
    
    for (const item of srn.items) {
      const approved = approvalMap.get(item.materialId)!;
      if (approved.packets < item.requestedPackets || approved.looseUnits < item.requestedLooseUnits) {
        allApproved = false;
      }
      if (approved.packets > 0 || approved.looseUnits > 0) {
        anyApproved = true;
      }
    }

    const newStatus = allApproved ? SRNStatus.APPROVED : SRNStatus.PARTIAL;

    if (!anyApproved) {
      throw new BadRequestException('At least one item must be approved');
    }

    // Execute in transaction - BLOCK INVENTORY HERE
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
          data: {
            approvedPackets: approved.packets,
            approvedLooseUnits: approved.looseUnits,
          },
        });

        // Block inventory (only if something approved)
        if (approved.packets > 0 || approved.looseUnits > 0) {
          await this.manufacturerInventory.blockForDispatch(
            item.materialId,
            manufacturerId,
            approved.packets,
            approved.looseUnits,
            adminId,
            srn.id,
            tx,
          );
        }
      }
    });

    // Notify retailer and manufacturer
    const retailer = await this.prisma.user.findUnique({
      where: { id: srn.retailerId },
      select: { name: true },
    });

    await this.notificationService.create(
      srn.retailerId,
      NotificationType.SRN_APPROVED,
      'SRN Approved',
      `Your SRN ${srn.srnNumber} has been ${newStatus === SRNStatus.APPROVED ? 'fully' : 'partially'} approved`,
      srn.id,
    );

    await this.notificationService.create(
      manufacturerId,
      NotificationType.SRN_APPROVED,
      'New SRN Approved',
      `SRN ${srn.srnNumber} from ${retailer?.name} has been approved. Please create dispatch.`,
      srn.id,
    );

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

    // Notify retailer
    await this.notificationService.create(
      srn.retailerId,
      NotificationType.SRN_REJECTED,
      'SRN Rejected',
      `Your SRN ${srn.srnNumber} has been rejected. Reason: ${rejectionNote}`,
      srn.id,
    );

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
            material: { select: { name: true, sqCode: true } },
          },
        },
        approver: { select: { name: true } },
      },
    });

    if (!srn) {
      throw new NotFoundException('SRN not found');
    }

    // Get manufacturer name if set
    let manufacturerName: string | undefined;
    if (srn.manufacturerId) {
      const manufacturer = await this.prisma.user.findUnique({
        where: { id: srn.manufacturerId },
        select: { name: true },
      });
      manufacturerName = manufacturer?.name;
    }

    return { ...srn, manufacturerName };
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
            material: { select: { name: true, sqCode: true } },
          },
        },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with manufacturer names
    const enriched = await Promise.all(
      srns.map(async (srn) => {
        let manufacturerName: string | undefined;
        if (srn.manufacturerId) {
          const manufacturer = await this.prisma.user.findUnique({
            where: { id: srn.manufacturerId },
            select: { name: true },
          });
          manufacturerName = manufacturer?.name;
        }
        return { ...srn, manufacturerName };
      }),
    );

    return enriched.map(s => this.mapToResponse(s));
  }

  /**
   * Get SRNs for manufacturer (approved/partial only)
   */
  async findByManufacturer(manufacturerId: string, status?: SRNStatus): Promise<SRNResponseDto[]> {
    const where: any = { 
      manufacturerId,
      status: status || { in: [SRNStatus.APPROVED, SRNStatus.PARTIAL] },
    };

    const srns = await this.prisma.sRN.findMany({
      where,
      include: {
        retailer: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
        approver: { select: { name: true } },
        dispatchOrder: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get manufacturer name
    const manufacturer = await this.prisma.user.findUnique({
      where: { id: manufacturerId },
      select: { name: true },
    });

    const enriched = srns.map(srn => ({
      ...srn,
      manufacturerName: manufacturer?.name,
    }));

    return enriched.map(s => this.mapToResponse(s));
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
            material: { select: { name: true, sqCode: true } },
          },
        },
        approver: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with manufacturer names
    const enriched = await Promise.all(
      srns.map(async (srn) => {
        let manufacturerName: string | undefined;
        if (srn.manufacturerId) {
          const manufacturer = await this.prisma.user.findUnique({
            where: { id: srn.manufacturerId },
            select: { name: true },
          });
          manufacturerName = manufacturer?.name;
        }
        return { ...srn, manufacturerName };
      }),
    );

    return enriched.map(s => this.mapToResponse(s));
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
      manufacturerId: srn.manufacturerId,
      manufacturerName: srn.manufacturerName,
      status: srn.status,
      items: srn.items.map((item: any): SRNItemResponseDto => ({
        id: item.id,
        materialId: item.materialId,
        materialName: item.material?.name || '',
        sqCode: item.material?.sqCode || '',
        requestedPackets: item.requestedPackets,
        requestedLooseUnits: item.requestedLooseUnits,
        approvedPackets: item.approvedPackets,
        approvedLooseUnits: item.approvedLooseUnits,
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