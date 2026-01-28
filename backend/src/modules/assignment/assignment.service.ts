import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentResponseDto,
} from './dto/assignment.dto';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a retailer-manufacturer assignment
   * ADMIN ONLY
   */
  async create(dto: CreateAssignmentDto, adminId: string): Promise<AssignmentResponseDto> {
    // Validate retailer exists and is a retailer
    const retailer = await this.prisma.user.findUnique({
      where: { id: dto.retailerId },
    });

    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }

    if (retailer.role !== 'RETAILER') {
      throw new BadRequestException('User is not a retailer');
    }

    if (!retailer.isActive) {
      throw new BadRequestException('Retailer is not active');
    }

    // Validate manufacturer exists and is a manufacturer
    const manufacturer = await this.prisma.user.findUnique({
      where: { id: dto.manufacturerId },
    });

    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }

    if (manufacturer.role !== 'MANUFACTURER') {
      throw new BadRequestException('User is not a manufacturer');
    }

    if (!manufacturer.isActive) {
      throw new BadRequestException('Manufacturer is not active');
    }

    // Check if assignment already exists
    const existing = await this.prisma.retailerManufacturerAssignment.findUnique({
      where: {
        retailerId_manufacturerId: {
          retailerId: dto.retailerId,
          manufacturerId: dto.manufacturerId,
        },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Assignment already exists');
      }
      // Reactivate existing assignment
      const reactivated = await this.prisma.retailerManufacturerAssignment.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          assignedAt: new Date(),
          assignedBy: adminId,
        },
        include: {
          retailer: { select: { name: true, email: true } },
          manufacturer: { select: { name: true, email: true } },
          admin: { select: { name: true } },
        },
      });
      return this.mapToResponse(reactivated);
    }

    // Create new assignment
    const assignment = await this.prisma.retailerManufacturerAssignment.create({
      data: {
        retailerId: dto.retailerId,
        manufacturerId: dto.manufacturerId,
        assignedBy: adminId,
      },
      include: {
        retailer: { select: { name: true, email: true } },
        manufacturer: { select: { name: true, email: true } },
        admin: { select: { name: true } },
      },
    });

    return this.mapToResponse(assignment);
  }

  /**
   * Get all assignments
   * ADMIN ONLY
   */
  async findAll(activeOnly: boolean = true): Promise<AssignmentResponseDto[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const assignments = await this.prisma.retailerManufacturerAssignment.findMany({
      where,
      include: {
        retailer: { select: { name: true, email: true } },
        manufacturer: { select: { name: true, email: true } },
        admin: { select: { name: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map(a => this.mapToResponse(a));
  }

  /**
   * Get assignments by retailer
   */
  async findByRetailer(retailerId: string): Promise<AssignmentResponseDto[]> {
    const assignments = await this.prisma.retailerManufacturerAssignment.findMany({
      where: { retailerId, isActive: true },
      include: {
        retailer: { select: { name: true, email: true } },
        manufacturer: { select: { name: true, email: true } },
        admin: { select: { name: true } },
      },
    });

    return assignments.map(a => this.mapToResponse(a));
  }

  /**
   * Get assigned manufacturers for a retailer
   */
  async getAssignedManufacturers(retailerId: string): Promise<{ id: string; name: string; email: string }[]> {
    const assignments = await this.prisma.retailerManufacturerAssignment.findMany({
      where: { retailerId, isActive: true },
      include: {
        manufacturer: { select: { id: true, name: true, email: true } },
      },
    });

    return assignments.map(a => ({
      id: a.manufacturer.id,
      name: a.manufacturer.name,
      email: a.manufacturer.email,
    }));
  }

  /**
   * Check if retailer is assigned to manufacturer
   */
  async isAssigned(retailerId: string, manufacturerId: string): Promise<boolean> {
    const assignment = await this.prisma.retailerManufacturerAssignment.findUnique({
      where: {
        retailerId_manufacturerId: { retailerId, manufacturerId },
      },
    });

    return assignment?.isActive ?? false;
  }

  /**
   * Get assignments by manufacturer
   */
  async findByManufacturer(manufacturerId: string): Promise<AssignmentResponseDto[]> {
    const assignments = await this.prisma.retailerManufacturerAssignment.findMany({
      where: { manufacturerId, isActive: true },
      include: {
        retailer: { select: { name: true, email: true } },
        manufacturer: { select: { name: true, email: true } },
        admin: { select: { name: true } },
      },
    });

    return assignments.map(a => this.mapToResponse(a));
  }

  /**
   * Update assignment
   * ADMIN ONLY
   */
  async update(id: string, dto: UpdateAssignmentDto): Promise<AssignmentResponseDto> {
    const assignment = await this.prisma.retailerManufacturerAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const updated = await this.prisma.retailerManufacturerAssignment.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      include: {
        retailer: { select: { name: true, email: true } },
        manufacturer: { select: { name: true, email: true } },
        admin: { select: { name: true } },
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Deactivate assignment
   * ADMIN ONLY
   */
  async deactivate(id: string): Promise<void> {
    const assignment = await this.prisma.retailerManufacturerAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.retailerManufacturerAssignment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Map to response DTO
   */
  private mapToResponse(assignment: any): AssignmentResponseDto {
    return {
      id: assignment.id,
      retailerId: assignment.retailerId,
      retailerName: assignment.retailer?.name || '',
      retailerEmail: assignment.retailer?.email || '',
      manufacturerId: assignment.manufacturerId,
      manufacturerName: assignment.manufacturer?.name || '',
      manufacturerEmail: assignment.manufacturer?.email || '',
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      assignedByName: assignment.admin?.name || '',
      isActive: assignment.isActive,
    };
  }
}