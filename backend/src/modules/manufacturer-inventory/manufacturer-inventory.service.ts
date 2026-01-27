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
        material: { select: { name: true } },
      },
      orderBy: { material: { name: 'asc' } },
    });

    const items = inventory.map(inv => this.mapToResponse(inv));
    const totalAvailable = items.reduce((sum, i) => sum + i.availablePackets, 0);
    const totalBlocked = items.reduce((sum, i) => sum + i.blockedPackets, 0);

    return {
      totalMaterials: items.length,
      totalAvailablePackets: totalAvailable,
      totalBlockedPackets: totalBlocked,
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
        material: { select: { name: true } },
      },
    });

    return inventory ? this.mapToResponse(inventory) : null;
  }

  /**
   * Add production to inventory
   */
  async addProduction(
    materialId: string,
    manufacturerId: string,
    packets: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets <= 0) {
      throw new BadRequestException('Packets must be positive');
    }

    const prisma = tx || this.prisma;

    // Upsert inventory
    const inventory = await prisma.manufacturerInventory.upsert({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      update: {
        fullPackets: { increment: packets },
      },
      create: {
        materialId,
        manufacturerId,
        fullPackets: packets,
        blockedPackets: 0,
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
        unitsChange: 0,
        referenceType: 'PRODUCTION',
        referenceId,
        packetsAfter: inventory.fullPackets,
        unitsAfter: 0,
        blockedAfter: inventory.blockedPackets,
      },
    });
  }

  /**
   * Block packets for dispatch (after SRN approval)
   */
  async blockForDispatch(
    materialId: string,
    manufacturerId: string,
    packets: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets <= 0) {
      throw new BadRequestException('Packets must be positive');
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
    if (availablePackets < packets) {
      throw new BadRequestException(
        `Insufficient available packets. Available: ${availablePackets}, Requested: ${packets}`,
      );
    }

    // Block packets
    const updated = await prisma.manufacturerInventory.update({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      data: {
        blockedPackets: { increment: packets },
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
        unitsAfter: 0,
        blockedAfter: updated.blockedPackets,
        notes: `Blocked ${packets} packets for dispatch`,
      },
    });
  }

  /**
   * Execute dispatch - remove blocked packets
   */
  async executeDispatch(
    materialId: string,
    manufacturerId: string,
    packets: number,
    userId: string,
    referenceId: string,
    tx?: any,
  ): Promise<void> {
    if (packets <= 0) {
      throw new BadRequestException('Packets must be positive');
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

    // Remove from both fullPackets and blockedPackets
    const updated = await prisma.manufacturerInventory.update({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
      data: {
        fullPackets: { decrement: packets },
        blockedPackets: { decrement: packets },
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
        unitsChange: 0,
        referenceType: 'DISPATCH',
        referenceId,
        packetsAfter: updated.fullPackets,
        unitsAfter: 0,
        blockedAfter: updated.blockedPackets,
        notes: `Dispatched ${packets} packets`,
      },
    });
  }

  /**
   * Check available packets (not blocked)
   */
  async getAvailablePackets(materialId: string, manufacturerId: string): Promise<number> {
    const inventory = await this.prisma.manufacturerInventory.findUnique({
      where: {
        materialId_manufacturerId: { materialId, manufacturerId },
      },
    });

    if (!inventory) {
      return 0;
    }

    return inventory.fullPackets - inventory.blockedPackets;
  }

  /**
   * Map inventory entity to response DTO
   */
  private mapToResponse(inventory: any): ManufacturerInventoryResponseDto {
    const availablePackets = inventory.fullPackets - inventory.blockedPackets;

    return {
      id: inventory.id,
      materialId: inventory.materialId,
      materialName: inventory.material?.name || '',
      manufacturerId: inventory.manufacturerId,
      availablePackets,
      blockedPackets: inventory.blockedPackets,
      totalPackets: inventory.fullPackets,
      updatedAt: inventory.updatedAt,
    };
  }
}