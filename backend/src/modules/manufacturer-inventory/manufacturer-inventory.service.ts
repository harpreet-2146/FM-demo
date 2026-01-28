import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  ManufacturerInventoryResponseDto,
  ManufacturerInventorySummaryDto,
} from './dto/manufacturer-inventory.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class ManufacturerInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get inventory for a specific manufacturer
   */
  async getByManufacturer(manufacturerId: string): Promise<ManufacturerInventorySummaryDto> {
    const inventory = await this.prisma.manufacturerInventory.findMany({
      where: { manufacturerId },
      include: {
        material: { select: { name: true, sqCode: true } },
      },
      orderBy: { material: { name: 'asc' } },
    });

    const items = inventory.map(inv => this.mapToResponse(inv));
    const totalAvailablePackets = items.reduce((sum, i) => sum + i.availablePackets, 0);
    const totalBlockedPackets = items.reduce((sum, i) => sum + i.blockedPackets, 0);
    const totalAvailableLooseUnits = items.reduce((sum, i) => sum + i.availableLooseUnits, 0);
    const totalBlockedLooseUnits = items.reduce((sum, i) => sum + i.blockedLooseUnits, 0);

    return {
      totalMaterials: items.length,
      totalAvailablePackets,
      totalBlockedPackets,
      totalAvailableLooseUnits,
      totalBlockedLooseUnits,
      items,
    };
  }

  /**
   * Get inventory for specific material and manufacturer
   */
  async getByMaterialAndManufacturer(
    materialId: string,
    manufacturerId: string,
  ): Promise<ManufacturerInventoryResponseDto | null> {
    const inventory = await this.prisma.manufacturerInventory.findUnique({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      include: {
        material: { select: { name: true, sqCode: true } },
      },
    });

    return inventory ? this.mapToResponse(inventory) : null;
  }

  /**
   * Add production to inventory (packets and/or loose units)
   */
  async addProduction(
    materialId: string,
    manufacturerId: string,
    packets: number,
    looseUnits: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets < 0 || looseUnits < 0) {
      throw new BadRequestException('Packets and loose units cannot be negative');
    }
    if (packets === 0 && looseUnits === 0) {
      throw new BadRequestException('At least one of packets or loose units must be positive');
    }

    const prisma = tx || this.prisma;

    // Upsert inventory
    const inventory = await prisma.manufacturerInventory.upsert({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      update: {
        fullPackets: { increment: packets },
        looseUnits: { increment: looseUnits },
      },
      create: {
        materialId,
        manufacturerId,
        fullPackets: packets,
        blockedPackets: 0,
        looseUnits: looseUnits,
        blockedLooseUnits: 0,
      },
    });

    // Log transaction
    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.PRODUCTION,
        locationType: 'MANUFACTURER',
        locationId: manufacturerId,
        packetsChange: packets,
        unitsChange: looseUnits,
        referenceType: 'PRODUCTION',
        referenceId,
        packetsAfter: inventory.fullPackets,
        unitsAfter: inventory.looseUnits,
        blockedAfter: inventory.blockedPackets,
        blockedUnitsAfter: inventory.blockedLooseUnits,
      },
    });
  }

  /**
   * Block packets and loose units for dispatch (after SRN approval)
   */
  async blockForDispatch(
    materialId: string,
    manufacturerId: string,
    packets: number,
    looseUnits: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets < 0 || looseUnits < 0) {
      throw new BadRequestException('Packets and loose units cannot be negative');
    }

    const prisma = tx || this.prisma;

    // Get current inventory
    const inventory = await prisma.manufacturerInventory.findUnique({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
    });

    if (!inventory) {
      throw new BadRequestException('No inventory found for this material');
    }

    const availablePackets = inventory.fullPackets - inventory.blockedPackets;
    const availableLooseUnits = inventory.looseUnits - inventory.blockedLooseUnits;

    if (availablePackets < packets) {
      throw new BadRequestException(
        `Insufficient available packets. Available: ${availablePackets}, Requested: ${packets}`,
      );
    }

    if (availableLooseUnits < looseUnits) {
      throw new BadRequestException(
        `Insufficient available loose units. Available: ${availableLooseUnits}, Requested: ${looseUnits}`,
      );
    }

    // Block packets and loose units
    const updated = await prisma.manufacturerInventory.update({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      data: {
        blockedPackets: { increment: packets },
        blockedLooseUnits: { increment: looseUnits },
      },
    });

    // Log transaction
    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.DISPATCH_BLOCK,
        locationType: 'MANUFACTURER',
        locationId: manufacturerId,
        packetsChange: 0,
        unitsChange: 0,
        referenceType: 'SRN',
        referenceId,
        packetsAfter: updated.fullPackets,
        unitsAfter: updated.looseUnits,
        blockedAfter: updated.blockedPackets,
        blockedUnitsAfter: updated.blockedLooseUnits,
        notes: `Blocked ${packets} packets and ${looseUnits} loose units for dispatch`,
      },
    });
  }

  /**
   * Unblock inventory (on SRN rejection)
   */
  async unblockInventory(
    materialId: string,
    manufacturerId: string,
    packets: number,
    looseUnits: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets < 0 || looseUnits < 0) {
      throw new BadRequestException('Packets and loose units cannot be negative');
    }

    const prisma = tx || this.prisma;

    const inventory = await prisma.manufacturerInventory.findUnique({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
    });

    if (!inventory) {
      throw new BadRequestException('No inventory found for this material');
    }

    if (inventory.blockedPackets < packets || inventory.blockedLooseUnits < looseUnits) {
      throw new BadRequestException('Cannot unblock more than currently blocked');
    }

    const updated = await prisma.manufacturerInventory.update({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      data: {
        blockedPackets: { decrement: packets },
        blockedLooseUnits: { decrement: looseUnits },
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.DISPATCH_UNBLOCK,
        locationType: 'MANUFACTURER',
        locationId: manufacturerId,
        packetsChange: 0,
        unitsChange: 0,
        referenceType: 'SRN',
        referenceId,
        packetsAfter: updated.fullPackets,
        unitsAfter: updated.looseUnits,
        blockedAfter: updated.blockedPackets,
        blockedUnitsAfter: updated.blockedLooseUnits,
        notes: `Unblocked ${packets} packets and ${looseUnits} loose units (SRN rejected)`,
      },
    });
  }

  /**
   * Execute dispatch - remove blocked packets and loose units
   */
  async executeDispatch(
    materialId: string,
    manufacturerId: string,
    packets: number,
    looseUnits: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets < 0 || looseUnits < 0) {
      throw new BadRequestException('Packets and loose units cannot be negative');
    }

    const prisma = tx || this.prisma;

    // Get current inventory
    const inventory = await prisma.manufacturerInventory.findUnique({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
    });

    if (!inventory) {
      throw new BadRequestException('No inventory found for this material');
    }

    if (inventory.blockedPackets < packets) {
      throw new BadRequestException(
        `Insufficient blocked packets. Blocked: ${inventory.blockedPackets}, Requested: ${packets}`,
      );
    }

    if (inventory.blockedLooseUnits < looseUnits) {
      throw new BadRequestException(
        `Insufficient blocked loose units. Blocked: ${inventory.blockedLooseUnits}, Requested: ${looseUnits}`,
      );
    }

    // Remove from both fullPackets/looseUnits and blocked
    const updated = await prisma.manufacturerInventory.update({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      data: {
        fullPackets: { decrement: packets },
        blockedPackets: { decrement: packets },
        looseUnits: { decrement: looseUnits },
        blockedLooseUnits: { decrement: looseUnits },
      },
    });

    // Log transaction
    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.DISPATCH_EXECUTE,
        locationType: 'MANUFACTURER',
        locationId: manufacturerId,
        packetsChange: -packets,
        unitsChange: -looseUnits,
        referenceType: 'DISPATCH',
        referenceId,
        packetsAfter: updated.fullPackets,
        unitsAfter: updated.looseUnits,
        blockedAfter: updated.blockedPackets,
        blockedUnitsAfter: updated.blockedLooseUnits,
        notes: `Dispatched ${packets} packets and ${looseUnits} loose units`,
      },
    });
  }

  /**
   * Add inventory from return restock
   */
  async restockFromReturn(
    materialId: string,
    manufacturerId: string,
    packets: number,
    looseUnits: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets < 0 || looseUnits < 0) {
      throw new BadRequestException('Packets and loose units cannot be negative');
    }

    const prisma = tx || this.prisma;

    const inventory = await prisma.manufacturerInventory.upsert({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      update: {
        fullPackets: { increment: packets },
        looseUnits: { increment: looseUnits },
      },
      create: {
        materialId,
        manufacturerId,
        fullPackets: packets,
        blockedPackets: 0,
        looseUnits: looseUnits,
        blockedLooseUnits: 0,
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        materialId,
        userId,
        transactionType: TransactionType.RETURN_RESTOCK,
        locationType: 'MANUFACTURER',
        locationId: manufacturerId,
        packetsChange: packets,
        unitsChange: looseUnits,
        referenceType: 'RETURN',
        referenceId,
        packetsAfter: inventory.fullPackets,
        unitsAfter: inventory.looseUnits,
        blockedAfter: inventory.blockedPackets,
        blockedUnitsAfter: inventory.blockedLooseUnits,
        notes: `Restocked ${packets} packets and ${looseUnits} loose units from return`,
      },
    });
  }

  /**
   * Check available packets and loose units (not blocked)
   */
  async getAvailable(
    materialId: string,
    manufacturerId: string,
  ): Promise<{ packets: number; looseUnits: number }> {
    const inventory = await this.prisma.manufacturerInventory.findUnique({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
    });

    if (!inventory) {
      return { packets: 0, looseUnits: 0 };
    }

    return {
      packets: inventory.fullPackets - inventory.blockedPackets,
      looseUnits: inventory.looseUnits - inventory.blockedLooseUnits,
    };
  }

  /**
   * Get available packets (not blocked) - backward compatibility
   */
  async getAvailablePackets(materialId: string, manufacturerId: string): Promise<number> {
    const { packets } = await this.getAvailable(materialId, manufacturerId);
    return packets;
  }

  /**
   * Map inventory entity to response DTO
   */
  private mapToResponse(inventory: any): ManufacturerInventoryResponseDto {
    const availablePackets = inventory.fullPackets - inventory.blockedPackets;
    const availableLooseUnits = inventory.looseUnits - inventory.blockedLooseUnits;

    return {
      id: inventory.id,
      materialId: inventory.materialId,
      sqCode: inventory.material?.sqCode || '',
      materialName: inventory.material?.name || '',
      manufacturerId: inventory.manufacturerId,
      availablePackets,
      blockedPackets: inventory.blockedPackets,
      totalPackets: inventory.fullPackets,
      availableLooseUnits,
      blockedLooseUnits: inventory.blockedLooseUnits,
      totalLooseUnits: inventory.looseUnits,
      updatedAt: inventory.updatedAt,
    };
  }
}