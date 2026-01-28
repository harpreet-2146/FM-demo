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
import { Money } from '../../common/utils/money.util';
import {
  CreateDispatchOrderDto,
  ExecuteDispatchDto,
  DispatchOrderResponseDto,
  DispatchOrderAdminResponseDto,
} from './dto/dispatch.dto';
import { DispatchStatus, SRNStatus, NotificationType } from '@prisma/client';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly manufacturerInventory: ManufacturerInventoryService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create dispatch order from approved SRN
   * MANUFACTURER ONLY (changed from Admin)
   */
  async create(
    dto: CreateDispatchOrderDto,
    manufacturerId: string,
  ): Promise<DispatchOrderResponseDto> {
    // Get SRN with items
    const srn = await this.prisma.sRN.findUnique({
      where: { id: dto.srnId },
      include: {
        items: {
          include: {
            material: true,
          },
        },
        retailer: { select: { name: true } },
      },
    });

    if (!srn) {
      throw new NotFoundException('SRN not found');
    }

    // Validate SRN is assigned to this manufacturer
    if (srn.manufacturerId !== manufacturerId) {
      throw new ForbiddenException('This SRN is not assigned to you');
    }

    if (srn.status !== SRNStatus.APPROVED && srn.status !== SRNStatus.PARTIAL) {
      throw new BadRequestException('SRN must be approved before creating dispatch');
    }

    // Check if dispatch already exists for this SRN
    const existingDispatch = await this.prisma.dispatchOrder.findUnique({
      where: { srnId: srn.id },
    });

    if (existingDispatch) {
      throw new BadRequestException('Dispatch order already exists for this SRN');
    }

    // Generate dispatch number
    const dispatchNumber = await this.sequenceService.getNextNumber('DO');

    // Calculate totals and create items
    let totalPackets = 0;
    let totalLooseUnits = 0;
    let subtotal = Money.zero();
    const itemsData: any[] = [];

    for (const item of srn.items) {
      const approvedPackets = item.approvedPackets || 0;
      const approvedLooseUnits = item.approvedLooseUnits || 0;
      
      if (approvedPackets === 0 && approvedLooseUnits === 0) continue;

      totalPackets += approvedPackets;
      totalLooseUnits += approvedLooseUnits;

      const mrp = Money.from(item.material.mrpPerPacket.toString());
      const unitPrice = Money.calculateUnitPrice(mrp, item.material.unitsPerPacket);
      
      // Calculate line total: (packets * mrpPerPacket) + (looseUnits * unitPrice)
      const packetValue = Money.multiply(mrp, approvedPackets);
      const unitValue = Money.multiply(unitPrice, approvedLooseUnits);
      const lineTotal = Money.add(packetValue, unitValue);
      
      subtotal = Money.add(subtotal, lineTotal);

      itemsData.push({
        materialId: item.materialId,
        packets: approvedPackets,
        looseUnits: approvedLooseUnits,
        unitPrice: Money.toNumber(unitPrice),
        lineTotal: Money.toNumber(lineTotal),
        hsnCode: item.material.hsnCode,
        gstRate: parseFloat(item.material.gstRate.toString()),
      });
    }

    // Create dispatch order - createdBy is now the Manufacturer
    const dispatch = await this.prisma.dispatchOrder.create({
      data: {
        dispatchNumber,
        srnId: srn.id,
        manufacturerId,
        createdBy: manufacturerId, // Manufacturer creates dispatch
        status: DispatchStatus.PENDING,
        totalPackets,
        totalLooseUnits,
        subtotal: Money.toNumber(subtotal),
        deliveryNotes: dto.deliveryNotes,
        items: {
          create: itemsData,
        },
      },
      include: {
        srn: {
          include: {
            retailer: { select: { name: true } },
          },
        },
        creator: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
    });

    // Create GRN placeholder
    const grnNumber = await this.sequenceService.getNextNumber('GRN');
    await this.prisma.gRN.create({
      data: {
        grnNumber,
        dispatchId: dispatch.id,
        retailerId: srn.retailerId,
        status: 'PENDING',
        items: {
          create: itemsData.map(item => ({
            materialId: item.materialId,
            expectedPackets: item.packets,
            expectedLooseUnits: item.looseUnits,
          })),
        },
      },
    });

    // Notify Admin
    const adminIds = await this.notificationService.getAdminUserIds();
    await this.notificationService.createForMultipleUsers(
      adminIds,
      NotificationType.DISPATCH_CREATED,
      'Dispatch Created',
      `Dispatch ${dispatchNumber} created for SRN ${srn.srnNumber}`,
      dispatch.id,
    );

    return this.mapToResponse(dispatch);
  }

  /**
   * Execute dispatch - ship goods
   * MANUFACTURER ONLY
   */
  async execute(
    id: string,
    dto: ExecuteDispatchDto,
    manufacturerId: string,
  ): Promise<DispatchOrderResponseDto> {
    const dispatch = await this.prisma.dispatchOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
        srn: {
          include: {
            retailer: { select: { name: true } },
          },
        },
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch order not found');
    }

    if (dispatch.manufacturerId !== manufacturerId) {
      throw new ForbiddenException('This dispatch is not assigned to you');
    }

    if (dispatch.status !== DispatchStatus.PENDING) {
      throw new BadRequestException('Dispatch already executed or delivered');
    }

    // Execute in transaction - remove blocked inventory
    await this.prisma.$transaction(async (tx) => {
      for (const item of dispatch.items) {
        await this.manufacturerInventory.executeDispatch(
          item.materialId,
          manufacturerId,
          item.packets,
          item.looseUnits,
          manufacturerId,
          dispatch.id,
          tx,
        );
      }

      await tx.dispatchOrder.update({
        where: { id },
        data: {
          status: DispatchStatus.IN_TRANSIT,
          executedAt: new Date(),
          deliveryNotes: dto.deliveryNotes || dispatch.deliveryNotes,
        },
      });
    });

    // Notify retailer
    await this.notificationService.create(
      dispatch.srn.retailerId,
      NotificationType.DISPATCH_EXECUTED,
      'Goods Dispatched',
      `Dispatch ${dispatch.dispatchNumber} is now in transit. Please prepare to receive goods.`,
      dispatch.id,
    );

    return this.findOne(id, manufacturerId);
  }

  /**
   * Get dispatch by ID - Manufacturer view (no financial data)
   */
  async findOne(id: string, manufacturerId: string): Promise<DispatchOrderResponseDto> {
    const dispatch = await this.prisma.dispatchOrder.findFirst({
      where: { id, manufacturerId },
      include: {
        srn: {
          include: {
            retailer: { select: { name: true } },
          },
        },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch order not found');
    }

    return this.mapToResponse(dispatch);
  }

  /**
   * Get dispatch by ID - Admin view (with financial data)
   */
  async findOneAdmin(id: string): Promise<DispatchOrderAdminResponseDto> {
    const dispatch = await this.prisma.dispatchOrder.findUnique({
      where: { id },
      include: {
        srn: {
          include: {
            retailer: { select: { name: true } },
          },
        },
        creator: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
    });

    if (!dispatch) {
      throw new NotFoundException('Dispatch order not found');
    }

    return this.mapToAdminResponse(dispatch);
  }

  /**
   * Get dispatches for manufacturer
   */
  async findByManufacturer(manufacturerId: string): Promise<DispatchOrderResponseDto[]> {
    const dispatches = await this.prisma.dispatchOrder.findMany({
      where: { manufacturerId },
      include: {
        srn: {
          include: {
            retailer: { select: { name: true } },
          },
        },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return dispatches.map(d => this.mapToResponse(d));
  }

  /**
   * Get all dispatches - Admin view
   */
  async findAll(status?: DispatchStatus): Promise<DispatchOrderAdminResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const dispatches = await this.prisma.dispatchOrder.findMany({
      where,
      include: {
        srn: {
          include: {
            retailer: { select: { name: true } },
          },
        },
        creator: { select: { name: true } },
        items: {
          include: {
            material: { select: { name: true, sqCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return dispatches.map(d => this.mapToAdminResponse(d));
  }

  /**
   * Map to response - NO financial data for Manufacturer
   */
  private mapToResponse(dispatch: any): DispatchOrderResponseDto {
    return {
      id: dispatch.id,
      dispatchNumber: dispatch.dispatchNumber,
      srnId: dispatch.srnId,
      srnNumber: dispatch.srn?.srnNumber || '',
      manufacturerId: dispatch.manufacturerId,
      retailerName: dispatch.srn?.retailer?.name || '',
      status: dispatch.status,
      totalPackets: dispatch.totalPackets,
      totalLooseUnits: dispatch.totalLooseUnits,
      items: dispatch.items.map((item: any) => ({
        id: item.id,
        materialId: item.materialId,
        sqCode: item.material?.sqCode || '',
        materialName: item.material?.name || '',
        packets: item.packets,
        looseUnits: item.looseUnits,
      })),
      createdAt: dispatch.createdAt,
      executedAt: dispatch.executedAt,
      deliveryNotes: dispatch.deliveryNotes,
    };
  }

  /**
   * Map to admin response - WITH financial data
   */
  private mapToAdminResponse(dispatch: any): DispatchOrderAdminResponseDto {
    return {
      id: dispatch.id,
      dispatchNumber: dispatch.dispatchNumber,
      srnId: dispatch.srnId,
      srnNumber: dispatch.srn?.srnNumber || '',
      manufacturerId: dispatch.manufacturerId,
      retailerName: dispatch.srn?.retailer?.name || '',
      status: dispatch.status,
      totalPackets: dispatch.totalPackets,
      totalLooseUnits: dispatch.totalLooseUnits,
      subtotal: parseFloat(dispatch.subtotal.toString()),
      items: dispatch.items.map((item: any) => ({
        id: item.id,
        materialId: item.materialId,
        sqCode: item.material?.sqCode || '',
        materialName: item.material?.name || '',
        packets: item.packets,
        looseUnits: item.looseUnits,
        unitPrice: parseFloat(item.unitPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
        hsnCode: item.hsnCode,
        gstRate: parseFloat(item.gstRate.toString()),
      })),
      createdAt: dispatch.createdAt,
      executedAt: dispatch.executedAt,
      deliveryNotes: dispatch.deliveryNotes,
      createdBy: dispatch.createdBy,
      createdByName: dispatch.creator?.name || '',
    };
  }
}