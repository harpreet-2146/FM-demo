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
            material: { select: { name: true, sqCode: true } },
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

    // Build received map - now with packets and looseUnits (no damaged)
    const receivedMap = new Map<string, { packets: number; looseUnits: number }>();
    for (const item of dto.items) {
      receivedMap.set(item.materialId, {
        packets: item.receivedPackets,
        looseUnits: item.receivedLooseUnits ?? 0,
      });
    }

    // Validate all items are present
    for (const item of grn.items) {
      if (!receivedMap.has(item.materialId)) {
        throw new BadRequestException(`Missing confirmation for material ${item.materialId}`);
      }
    }

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update GRN items and add to retailer inventory
      for (const item of grn.items) {
        const received = receivedMap.get(item.materialId)!;

        // Update GRN item with received quantities
        await tx.gRNItem.update({
          where: { id: item.id },
          data: {
            receivedPackets: received.packets,
            receivedLooseUnits: received.looseUnits,
          },
        });

        // Add received goods to retailer inventory
        // Note: If there are damaged goods, retailer should raise a Return separately
        if (received.packets > 0 || received.looseUnits > 0) {
          await this.retailerInventory.receiveGoods(
            item.materialId,
            retailerId,
            received.packets,
            received.looseUnits,
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
            material: { select: { name: true, sqCode: true } },
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
            material: { select: { name: true, sqCode: true } },
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
            material: { select: { name: true, sqCode: true } },
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
        sqCode: item.material?.sqCode || '',
        expectedPackets: item.expectedPackets,
        expectedLooseUnits: item.expectedLooseUnits ?? 0,
        receivedPackets: item.receivedPackets,
        receivedLooseUnits: item.receivedLooseUnits,
      })),
      createdAt: grn.createdAt,
      confirmedAt: grn.confirmedAt,
      notes: grn.notes,
      hasInvoice: !!grn.invoice,
    };
  }
}