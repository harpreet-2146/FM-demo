import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ManufacturerInventoryService } from '../manufacturer-inventory/manufacturer-inventory.service';
import { MaterialsService } from '../materials/materials.service';
import {
  CreateProductionBatchDto,
  ProductionBatchResponseDto,
  ProductionSummaryDto,
} from './dto/production.dto';

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manufacturerInventory: ManufacturerInventoryService,
    private readonly materialsService: MaterialsService,
  ) {}

  /**
   * Create a production batch
   * MANUFACTURER ONLY
   * 
   * Transaction:
   * 1. Creates batch record with HSN snapshot
   * 2. Adds packets to manufacturer inventory
   * 3. Marks material as having production (locks HSN/GST)
   */
  async create(
    dto: CreateProductionBatchDto,
    manufacturerId: string,
  ): Promise<ProductionBatchResponseDto> {
    // Get material
    const material = await this.materialsService.findOneEntity(dto.materialId);

    if (!material.isActive) {
      throw new BadRequestException('Cannot produce inactive material');
    }

    // Validate dates
    const mfgDate = new Date(dto.manufactureDate);
    const expDate = new Date(dto.expiryDate);

    if (expDate <= mfgDate) {
      throw new BadRequestException('Expiry date must be after manufacture date');
    }

    // Check batch number uniqueness for this manufacturer
    const existingBatch = await this.prisma.productionBatch.findUnique({
      where: {
        manufacturerId_batchNumber: {
          manufacturerId,
          batchNumber: dto.batchNumber,
        },
      },
    });

    if (existingBatch) {
      throw new ConflictException(
        `Batch number ${dto.batchNumber} already exists for this manufacturer`,
      );
    }

    // Execute in transaction
    const batch = await this.prisma.$transaction(async (tx) => {
      // 1. Create batch record with HSN snapshot
      const newBatch = await tx.productionBatch.create({
        data: {
          materialId: dto.materialId,
          manufacturerId,
          batchNumber: dto.batchNumber,
          manufactureDate: mfgDate,
          expiryDate: expDate,
          packetsProduced: dto.packetsProduced,
          hsnCodeSnapshot: material.hsnCode, // Snapshot HSN at production time
        },
        include: {
          material: { select: { name: true } },
        },
      });

      // 2. Add packets to manufacturer inventory
      await this.manufacturerInventory.addProduction(
        dto.materialId,
        manufacturerId,
        dto.packetsProduced,
        manufacturerId,
        newBatch.id,
        tx,
      );

      // 3. Mark material as having production (locks HSN/GST)
      if (!material.hasProduction) {
        await tx.material.update({
          where: { id: material.id },
          data: { hasProduction: true },
        });
      }

      return newBatch;
    });

    return this.mapToResponse(batch);
  }

  /**
   * Get batches for a manufacturer
   */
  async getByManufacturer(
    manufacturerId: string,
    options?: { limit?: number; materialId?: string },
  ): Promise<ProductionBatchResponseDto[]> {
    const where: any = { manufacturerId };
    if (options?.materialId) {
      where.materialId = options.materialId;
    }

    const batches = await this.prisma.productionBatch.findMany({
      where,
      include: {
        material: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
    });

    return batches.map(b => this.mapToResponse(b));
  }

  /**
   * Get production summary for manufacturer dashboard
   */
  async getSummary(manufacturerId: string): Promise<ProductionSummaryDto> {
    const [totalBatches, totalPackets, recentBatches] = await Promise.all([
      this.prisma.productionBatch.count({
        where: { manufacturerId },
      }),
      this.prisma.productionBatch.aggregate({
        where: { manufacturerId },
        _sum: { packetsProduced: true },
      }),
      this.getByManufacturer(manufacturerId, { limit: 10 }),
    ]);

    return {
      totalBatches,
      totalPacketsProduced: totalPackets._sum.packetsProduced || 0,
      recentBatches,
    };
  }

  /**
   * Get batch by ID
   */
  async findOne(id: string, manufacturerId?: string): Promise<ProductionBatchResponseDto> {
    const where: any = { id };
    if (manufacturerId) {
      where.manufacturerId = manufacturerId;
    }

    const batch = await this.prisma.productionBatch.findFirst({
      where,
      include: {
        material: { select: { name: true } },
      },
    });

    if (!batch) {
      throw new NotFoundException('Production batch not found');
    }

    return this.mapToResponse(batch);
  }

  /**
   * Map batch entity to response DTO
   */
  private mapToResponse(batch: any): ProductionBatchResponseDto {
    return {
      id: batch.id,
      materialId: batch.materialId,
      materialName: batch.material?.name || '',
      manufacturerId: batch.manufacturerId,
      batchNumber: batch.batchNumber,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate,
      packetsProduced: batch.packetsProduced,
      hsnCodeSnapshot: batch.hsnCodeSnapshot,
      createdAt: batch.createdAt,
    };
  }
}