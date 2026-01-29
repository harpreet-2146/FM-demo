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
   * 2. Adds packets and loose units to manufacturer inventory
   * 3. Marks material as having production (locks HSN/GST)
   */
  async create(
    dto: CreateProductionBatchDto,
    manufacturerId: string,
  ): Promise<ProductionBatchResponseDto> {
    // Validate that either materialId or sqCode is provided
    if (!dto.materialId && !dto.sqCode) {
      throw new BadRequestException('Either materialId or sqCode must be provided');
    }

    // Validate that at least one of packets or loose units is positive
    const packetsProduced = dto.packetsProduced || 0;
    const looseUnitsProduced = dto.looseUnitsProduced || 0;
    
    if (packetsProduced === 0 && looseUnitsProduced === 0) {
      throw new BadRequestException('At least one of packetsProduced or looseUnitsProduced must be positive');
    }

    // Resolve material ID
    let materialId: string;
    if (dto.materialId) {
      materialId = dto.materialId;
    } else {
    const material = await this.materialsService.findBySqCode(dto.sqCode!);
materialId = material.id;
    }

    // Get material
    const material = await this.materialsService.findOneEntity(materialId);

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
          materialId,
          manufacturerId,
          batchNumber: dto.batchNumber,
          manufactureDate: mfgDate,
          expiryDate: expDate,
          packetsProduced,
          looseUnitsProduced,
          hsnCodeSnapshot: material.hsnCode, // Snapshot HSN at production time
        },
        include: {
          material: { select: { name: true, sqCode: true } },
        },
      });

      // 2. Add packets and loose units to manufacturer inventory
      await this.manufacturerInventory.addProduction(
        materialId,
        manufacturerId,
        packetsProduced,
        looseUnitsProduced,
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
    options?: { limit?: number; materialId?: string; sqCode?: string },
  ): Promise<ProductionBatchResponseDto[]> {
    const where: any = { manufacturerId };
    
    if (options?.materialId) {
      where.materialId = options.materialId;
    } else if (options?.sqCode) {
      // Resolve material ID from sqCode
      const materialId = await this.materialsService.resolveMaterialId(options.sqCode);
      where.materialId = materialId;
    }

    const batches = await this.prisma.productionBatch.findMany({
      where,
      include: {
        material: { select: { name: true, sqCode: true } },
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
    const [totalBatches, aggregates, recentBatches] = await Promise.all([
      this.prisma.productionBatch.count({
        where: { manufacturerId },
      }),
      this.prisma.productionBatch.aggregate({
        where: { manufacturerId },
        _sum: { 
          packetsProduced: true,
          looseUnitsProduced: true,
        },
      }),
      this.getByManufacturer(manufacturerId, { limit: 10 }),
    ]);

    return {
      totalBatches,
      totalPacketsProduced: aggregates._sum.packetsProduced || 0,
      totalLooseUnitsProduced: aggregates._sum.looseUnitsProduced || 0,
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
        material: { select: { name: true, sqCode: true } },
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
      sqCode: batch.material?.sqCode || '',
      materialName: batch.material?.name || '',
      manufacturerId: batch.manufacturerId,
      batchNumber: batch.batchNumber,
      manufactureDate: batch.manufactureDate,
      expiryDate: batch.expiryDate,
      packetsProduced: batch.packetsProduced,
      looseUnitsProduced: batch.looseUnitsProduced,
      hsnCodeSnapshot: batch.hsnCodeSnapshot,
      createdAt: batch.createdAt,
    };
  }
}