import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Money } from '../../common/utils/money.util';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
  CommissionType,
} from './dto/material.dto';
import Decimal from 'decimal.js';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new material
   * ADMIN ONLY - All fields required, no defaults
   */
  async create(dto: CreateMaterialDto, adminId: string): Promise<MaterialResponseDto> {
    // Validate all required fields are present (class-validator handles this, but double-check)
    if (!dto.sqCode || dto.sqCode.trim() === '') {
      throw new BadRequestException('SQ Code is required - no default value allowed');
    }
    if (!dto.hsnCode || dto.hsnCode.trim() === '') {
      throw new BadRequestException('HSN code is required - no default value allowed');
    }
    if (dto.gstRate === undefined || dto.gstRate === null) {
      throw new BadRequestException('GST rate is required - no default value allowed');
    }
    if (!dto.unitsPerPacket || dto.unitsPerPacket <= 0) {
      throw new BadRequestException('Units per packet is required and must be positive');
    }
    if (!dto.mrpPerPacket || dto.mrpPerPacket <= 0) {
      throw new BadRequestException('MRP per packet is required and must be positive');
    }

    // Check sqCode uniqueness
    const existingSqCode = await this.prisma.material.findUnique({
      where: { sqCode: dto.sqCode.toUpperCase() },
    });

    if (existingSqCode) {
      throw new ConflictException(`SQ Code ${dto.sqCode} already exists`);
    }

    const material = await this.prisma.material.create({
      data: {
        sqCode: dto.sqCode.toUpperCase(),
        name: dto.name,
        description: dto.description,
        hsnCode: dto.hsnCode,
        gstRate: dto.gstRate,
        unitsPerPacket: dto.unitsPerPacket,
        mrpPerPacket: dto.mrpPerPacket,
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
        hasProduction: false, // New materials have no production
        isActive: true,
        createdBy: adminId,
      },
    });

    return this.mapToResponse(material);
  }

  /**
   * Get all materials
   * Admin sees all, others see only active
   */
  async findAll(includeInactive: boolean = false): Promise<MaterialResponseDto[]> {
    const where = includeInactive ? {} : { isActive: true };

    const materials = await this.prisma.material.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return materials.map(m => this.mapToResponse(m));
  }

  /**
   * Get material by ID
   */
  async findOne(id: string): Promise<MaterialResponseDto> {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return this.mapToResponse(material);
  }

  /**
   * Get material by SQ Code
   */
  async findBySqCode(sqCode: string): Promise<MaterialResponseDto> {
    const material = await this.prisma.material.findUnique({
      where: { sqCode: sqCode.toUpperCase() },
    });

    if (!material) {
      throw new NotFoundException(`Material with SQ Code ${sqCode} not found`);
    }

    return this.mapToResponse(material);
  }

  /**
   * Resolve material ID from either ID (UUID) or SQ Code
   * Useful for APIs that accept either identifier
   */
  async resolveMaterialId(identifier: string): Promise<string> {
    // Check if it's a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(identifier)) {
      // It's a UUID, verify it exists
      const material = await this.prisma.material.findUnique({
        where: { id: identifier },
        select: { id: true },
      });

      if (!material) {
        throw new NotFoundException(`Material with ID ${identifier} not found`);
      }

      return material.id;
    }

    // Assume it's an SQ Code
    const material = await this.prisma.material.findUnique({
      where: { sqCode: identifier.toUpperCase() },
      select: { id: true },
    });

    if (!material) {
      throw new NotFoundException(`Material with SQ Code ${identifier} not found`);
    }

    return material.id;
  }

  /**
   * Get raw material entity (for internal use)
   */
  async findOneEntity(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  /**
   * Get material entity by SQ Code (for internal use)
   */
  async findEntityBySqCode(sqCode: string) {
    const material = await this.prisma.material.findUnique({
      where: { sqCode: sqCode.toUpperCase() },
    });

    if (!material) {
      throw new NotFoundException(`Material with SQ Code ${sqCode} not found`);
    }

    return material;
  }

  /**
   * Update material
   * RULES:
   * - sqCode is NEVER updatable
   * - unitsPerPacket is NEVER updatable
   * - hsnCode is immutable after hasProduction = true
   * - gstRate is immutable after hasProduction = true
   */
  async update(id: string, dto: UpdateMaterialDto): Promise<MaterialResponseDto> {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // RULE: HSN is immutable after first production batch
    if (dto.hsnCode !== undefined && dto.hsnCode !== material.hsnCode) {
      if (material.hasProduction) {
        throw new ForbiddenException(
          'HSN code cannot be changed after production has started',
        );
      }
    }

    // RULE: GST rate is immutable after first production batch
    if (dto.gstRate !== undefined) {
      const currentGst = new Decimal(material.gstRate.toString());
      const newGst = new Decimal(dto.gstRate);
      if (!currentGst.equals(newGst) && material.hasProduction) {
        throw new ForbiddenException(
          'GST rate cannot be changed after production has started',
        );
      }
    }

    // Note: sqCode and unitsPerPacket are not in UpdateMaterialDto, so they can never be updated

    const updatedMaterial = await this.prisma.material.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        hsnCode: material.hasProduction ? undefined : dto.hsnCode,
        gstRate: material.hasProduction ? undefined : dto.gstRate,
        mrpPerPacket: dto.mrpPerPacket,
        commissionType: dto.commissionType,
        commissionValue: dto.commissionValue,
        isActive: dto.isActive,
      },
    });

    return this.mapToResponse(updatedMaterial);
  }

  /**
   * Mark material as having production
   * Called internally when first production batch is created
   * This LOCKS hsnCode and gstRate
   */
  async markProductionStarted(id: string): Promise<void> {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (!material.hasProduction) {
      await this.prisma.material.update({
        where: { id },
        data: { hasProduction: true },
      });
    }
  }

  /**
   * Deactivate material (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    await this.prisma.material.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Map material entity to response DTO
   */
  private mapToResponse(material: any): MaterialResponseDto {
    const mrp = Money.from(material.mrpPerPacket.toString());
    const unitPrice = Money.calculateUnitPrice(mrp, material.unitsPerPacket);

    return {
      id: material.id,
      sqCode: material.sqCode,
      name: material.name,
      description: material.description,
      hsnCode: material.hsnCode,
      gstRate: parseFloat(material.gstRate.toString()),
      unitsPerPacket: material.unitsPerPacket,
      mrpPerPacket: parseFloat(material.mrpPerPacket.toString()),
      unitPrice: Money.toNumber(unitPrice),
      commissionType: material.commissionType as CommissionType,
      commissionValue: parseFloat(material.commissionValue.toString()),
      hasProduction: material.hasProduction,
      isActive: material.isActive,
      createdAt: material.createdAt,
    };
  }
}