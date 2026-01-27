import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RetailerInventoryService } from '../retailer-inventory/retailer-inventory.service';
import { ConfirmGRNDto, GRNResponseDto } from './dto/grn.dto';
import { GRNStatus, DispatchStatus } from '@prisma/client';

@Injectable()
export class GRNService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailerInventory: RetailerInventoryService,
  ) {}

  /**
   * Confirm GRN - receive goods
   * RETAILER ONLY
   */
  async confirm(
    id: string,
    dto: ConfirmGRNDto,
    retailerId: string,
  ): Promise<GRNResponseDto> {
    const grn = await this.prisma.gRN.findUnique({
      where: { id },
      include: {
        dispatchOrder: true,
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        retailer: { select: { name: true } },
      },
    });

    if (!grn) {
      throw new NotFoundException('GRN not found');
    }

    if (grn.retailerId !== retailerId) {
      throw new ForbiddenException('This GRN is not for you');
    }

    if (grn.status !== GRNStatus.PENDING) {
      throw new BadRequestException('GRN already confirmed');
    }

    if (grn.dispatchOrder.status !== DispatchStatus.IN_TRANSIT) {
      throw new BadRequestException('Dispatch not yet executed');
    }

    // Build received map
    const receivedMap = new Map<string, { received: number; damaged: number }>();
    for (const item of dto.items) {
      receivedMap.set(item.materialId, {
        received: item.receivedPackets,
        damaged: item.damagedPackets || 0,
      });
    }

    // Validate all items
    for (const item of grn.items) {
      if (!receivedMap.has(item.materialId)) {
        throw new BadRequestException(`Missing confirmation for material ${item.materialId}`);
      }

      const received = receivedMap.get(item.materialId)!;
      if (received.damaged > received.received) {
        throw new BadRequestException('Damaged packets cannot exceed received packets');
      }
    }

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update GRN items and add to retailer inventory
      for (const item of grn.items) {
        const received = receivedMap.get(item.materialId)!;
        const goodPackets = received.received - received.damaged;

        await tx.gRNItem.update({
          where: { id: item.id },
          data: {
            receivedPackets: received.received,
            damagedPackets: received.damaged,
          },
        });

        // Add good packets to retailer inventory
        if (goodPackets > 0) {
          await this.retailerInventory.receiveGoods(
            item.materialId,
            retailerId,
            goodPackets,
            retailerId,
            grn.id,
            tx,
          );
        }
      }

      // Update GRN status
      await tx.gRN.update({
        where: { id },
        data: {
          status: GRNStatus.CONFIRMED,
          confirmedAt: new Date(),
          notes: dto.notes,
        },
      });

      // Update dispatch status
      await tx.dispatchOrder.update({
        where: { id: grn.dispatchId },
        data: {
          status: DispatchStatus.DELIVERED,
        },
      });
    });

    return this.findOne(id);
  }

  /**
   * Get GRN by ID
   */
  async findOne(id: string): Promise<GRNResponseDto> {
    const grn = await this.prisma.gRN.findUnique({
      where: { id },
      include: {
        dispatchOrder: true,
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        retailer: { select: { name: true } },
        invoice: { select: { id: true } },
      },
    });

    if (!grn) {
      throw new NotFoundException('GRN not found');
    }

    return this.mapToResponse(grn);
  }

  /**
   * Get GRNs for retailer
   */
  async findByRetailer(retailerId: string, status?: GRNStatus): Promise<GRNResponseDto[]> {
    const where: any = { retailerId };
    if (status) {
      where.status = status;
    }

    const grns = await this.prisma.gRN.findMany({
      where,
      include: {
        dispatchOrder: true,
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        retailer: { select: { name: true } },
        invoice: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return grns.map(g => this.mapToResponse(g));
  }

  /**
   * Get all GRNs
   */
  async findAll(status?: GRNStatus): Promise<GRNResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const grns = await this.prisma.gRN.findMany({
      where,
      include: {
        dispatchOrder: true,
        items: {
          include: {
            material: { select: { name: true } },
          },
        },
        retailer: { select: { name: true } },
        invoice: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return grns.map(g => this.mapToResponse(g));
  }

  /**
   * Map to response
   */
  private mapToResponse(grn: any): GRNResponseDto {
    return {
      id: grn.id,
      grnNumber: grn.grnNumber,
      dispatchId: grn.dispatchId,
      dispatchNumber: grn.dispatchOrder?.dispatchNumber || '',
      retailerId: grn.retailerId,
      retailerName: grn.retailer?.name || '',
      status: grn.status,
      items: grn.items.map((item: any) => ({
        id: item.id,
        materialId: item.materialId,
        materialName: item.material?.name || '',
        expectedPackets: item.expectedPackets,
        receivedPackets: item.receivedPackets,
        damagedPackets: item.damagedPackets,
      })),
      createdAt: grn.createdAt,
      confirmedAt: grn.confirmedAt,
      notes: grn.notes,
      hasInvoice: !!grn.invoice,
    };
  }
}