import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  RetailerInventoryResponseDto,
  RetailerInventorySummaryDto,
} from './dto/retailer-inventory.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class RetailerInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get inventory for a specific retailer
   */
  async getByRetailer(retailerId: string): Promise<RetailerInventorySummaryDto> {
    const inventory = await this.prisma.retailerInventory.findMany({
      where: { retailerId },
      include: {
        material: {
          select: { name: true, sqCode: true, unitsPerPacket: true },
        },
      },
      orderBy: { material: { name: 'asc' } },
    });

    const items = inventory.map(inv => this.mapToResponse(inv));
    const totalPackets = items.reduce((sum, i) => sum + i.fullPackets, 0);
    const totalLooseUnits = items.reduce((sum, i) => sum + i.looseUnits, 0);

    return {
      totalMaterials: items.length,
      totalPackets,
      totalLooseUnits,
      items,
    };
  }

  /**
   * Get inventory for specific material and retailer
   */
  async getByMaterialAndRetailer(
    materialId: string,
    retailerId: string,
  ): Promise<RetailerInventoryResponseDto | null> {
    const inventory = await this.prisma.retailerInventory.findUnique({
      where: {
        materialId_retailerId: { materialId, retailerId },
      },
      include: {
        material: { select: { name: true, sqCode: true, unitsPerPacket: true } },
      },
    });

    return inventory ? this.mapToResponse(inventory) : null;
  }

  /**
   * Receive goods from GRN
   * Adds packets and loose units to retailer inventory
   */
  async receiveGoods(
    materialId: string,
    retailerId: string,
    packets: number,
    looseUnits: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets < 0 || looseUnits < 0) {
      throw new BadRequestException('Packets and loose units must be non-negative');
    }

    if (packets === 0 && looseUnits === 0) {
      // Nothing to receive, skip
      return;
    }

    const prisma = tx || this.prisma;

    // Upsert inventory
    const inventory = await prisma.retailerInventory.upsert({
      where: {
        materialId_retailerId: { materialId, retailerId },
      },
      update: {
        fullPackets: { increment: packets },
        looseUnits: { increment: looseUnits },
      },
      create: {
        materialId,
        retailerId,
        fullPackets: packets,
        looseUnits: looseUnits,
      },
    });

    // Log transaction
    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.GRN_RECEIVE,
        locationType: 'RETAILER',
        locationId: retailerId,
        packetsChange: packets,
        unitsChange: looseUnits,
        referenceType: 'GRN',
        referenceId,
        packetsAfter: inventory.fullPackets,
        unitsAfter: inventory.looseUnits,
        blockedAfter: 0,
      },
    });
  }

  /**
   * Sell units - with auto-open packet logic
   * This is the core retailer operation
   * 
   * Rules:
   * - First use loose units
   * - If not enough, auto-open packets
   * - Constraint: looseUnits must always be < unitsPerPacket
   */
  async sellUnits(
    materialId: string,
    retailerId: string,
    units: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<{ packetsOpened: number }> {
    if (units <= 0) {
      throw new BadRequestException('Units must be positive');
    }

    const prisma = tx || this.prisma;

    // Get inventory with material info
    const inventory = await prisma.retailerInventory.findUnique({
      where: {
        materialId_retailerId: { materialId, retailerId },
      },
      include: {
        material: { select: { unitsPerPacket: true } },
      },
    });

    if (!inventory) {
      throw new BadRequestException('No inventory found for this material');
    }

    const unitsPerPacket = inventory.material.unitsPerPacket;
    const totalAvailableUnits = 
      inventory.fullPackets * unitsPerPacket + inventory.looseUnits;

    if (totalAvailableUnits < units) {
      throw new BadRequestException(
        `Insufficient inventory. Available units: ${totalAvailableUnits}, Requested: ${units}`,
      );
    }

    // Calculate how many packets need to be opened
    let packetsToOpen = 0;
    let looseUnitsAfterSale = inventory.looseUnits;
    let packetsAfterSale = inventory.fullPackets;

    if (inventory.looseUnits >= units) {
      // We have enough loose units
      looseUnitsAfterSale = inventory.looseUnits - units;
    } else {
      // Need to open packets
      const unitsNeeded = units - inventory.looseUnits;
      packetsToOpen = Math.ceil(unitsNeeded / unitsPerPacket);

      if (packetsToOpen > inventory.fullPackets) {
        throw new BadRequestException('Insufficient packets to open');
      }

      // Open packets
      packetsAfterSale = inventory.fullPackets - packetsToOpen;
      const unitsFromOpenedPackets = packetsToOpen * unitsPerPacket;
      
      // Loose units = (old loose + opened units) - sold units
      looseUnitsAfterSale = inventory.looseUnits + unitsFromOpenedPackets - units;
    }

    // Validate constraint: looseUnits < unitsPerPacket
    if (looseUnitsAfterSale >= unitsPerPacket) {
      throw new BadRequestException(
        'Internal error: loose units would exceed packet size',
      );
    }

    // Update inventory
    const updated = await prisma.retailerInventory.update({
      where: {
        materialId_retailerId: { materialId, retailerId },
      },
      data: {
        fullPackets: packetsAfterSale,
        looseUnits: looseUnitsAfterSale,
      },
    });

    // Log packet opening if any
    if (packetsToOpen > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          materialId,
          userId,
          transactionType: TransactionType.PACKET_OPEN,
          locationType: 'RETAILER',
          locationId: retailerId,
          packetsChange: -packetsToOpen,
          unitsChange: packetsToOpen * unitsPerPacket,
          referenceType: 'SALE',
          referenceId,
          packetsAfter: updated.fullPackets,
          unitsAfter: updated.looseUnits,
          blockedAfter: 0,
          notes: `Opened ${packetsToOpen} packet(s) for sale`,
        },
      });
    }

    // Log sale transaction
    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.SALE,
        locationType: 'RETAILER',
        locationId: retailerId,
        packetsChange: 0,
        unitsChange: -units,
        referenceType: 'SALE',
        referenceId,
        packetsAfter: updated.fullPackets,
        unitsAfter: updated.looseUnits,
        blockedAfter: 0,
      },
    });

    return { packetsOpened: packetsToOpen };
  }

  /**
   * Check available units for a material
   */
  async getAvailableUnits(materialId: string, retailerId: string): Promise<number> {
    const inventory = await this.prisma.retailerInventory.findUnique({
      where: {
        materialId_retailerId: { materialId, retailerId },
      },
      include: {
        material: { select: { unitsPerPacket: true } },
      },
    });

    if (!inventory) {
      return 0;
    }

    return inventory.fullPackets * inventory.material.unitsPerPacket + inventory.looseUnits;
  }

  /**
   * Map inventory entity to response DTO
   */
  private mapToResponse(inventory: any): RetailerInventoryResponseDto {
    const unitsPerPacket = inventory.material?.unitsPerPacket || 0;
    const totalUnits = inventory.fullPackets * unitsPerPacket + inventory.looseUnits;

    return {
      id: inventory.id,
      materialId: inventory.materialId,
      materialName: inventory.material?.name || '',
      sqCode: inventory.material?.sqCode || '',
      retailerId: inventory.retailerId,
      fullPackets: inventory.fullPackets,
      looseUnits: inventory.looseUnits,
      unitsPerPacket,
      totalUnits,
      updatedAt: inventory.updatedAt,
    };
  }
}