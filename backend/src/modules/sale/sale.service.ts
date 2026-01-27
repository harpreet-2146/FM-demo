import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { RetailerInventoryService } from '../retailer-inventory/retailer-inventory.service';
import { Money } from '../../common/utils/money.util';
import { CreateSaleDto, SaleResponseDto, SaleSummaryDto } from './dto/sale.dto';

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly retailerInventory: RetailerInventoryService,
  ) {}

  /**
   * Create a sale - B2C unit sale
   * RETAILER ONLY
   * 
   * This:
   * 1. Deducts units from retailer inventory (auto-opens packets)
   * 2. Creates sale record with snapshotted price
   * 3. Creates commission record (decoupled from invoice)
   */
  async create(dto: CreateSaleDto, retailerId: string): Promise<SaleResponseDto> {
    // Get material
    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    if (!material.isActive) {
      throw new BadRequestException('Material is not active');
    }

    // Check available units
    const availableUnits = await this.retailerInventory.getAvailableUnits(
      dto.materialId,
      retailerId,
    );

    if (availableUnits < dto.unitsSold) {
      throw new BadRequestException(
        `Insufficient inventory. Available: ${availableUnits}, Requested: ${dto.unitsSold}`,
      );
    }

    // Generate sale number
    const saleNumber = await this.sequenceService.getNextNumber('SALE');

    // Calculate prices
    const mrp = Money.from(material.mrpPerPacket.toString());
    const unitPrice = Money.calculateUnitPrice(mrp, material.unitsPerPacket);
    const totalAmount = Money.calculateLineTotal(unitPrice, dto.unitsSold);

    // Calculate commission
    const commissionValue = Money.from(material.commissionValue.toString());
    const commissionAmount = Money.calculateCommission(
      unitPrice,
      dto.unitsSold,
      material.commissionType,
      commissionValue,
    );

    // Execute in transaction
    const sale = await this.prisma.$transaction(async (tx) => {
      // Create sale record first to get ID
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          retailerId,
          materialId: dto.materialId,
          unitsSold: dto.unitsSold,
          unitPrice: Money.toNumber(unitPrice),
          totalAmount: Money.toNumber(totalAmount),
          packetsOpened: 0, // Will be updated after inventory operation
        },
        include: {
          material: { select: { name: true } },
        },
      });

      // Deduct from inventory
      const result = await this.retailerInventory.sellUnits(
        dto.materialId,
        retailerId,
        dto.unitsSold,
        retailerId,
        newSale.id,
        tx,
      );

      // Update sale with packets opened
      const updatedSale = await tx.sale.update({
        where: { id: newSale.id },
        data: { packetsOpened: result.packetsOpened },
        include: {
          material: { select: { name: true } },
        },
      });

      // Create commission record (decoupled from invoice)
      await tx.commission.create({
        data: {
          saleId: newSale.id,
          retailerId,
          commissionType: material.commissionType,
          commissionRate: Money.toNumber(commissionValue),
          unitsSold: dto.unitsSold,
          amount: Money.toNumber(commissionAmount),
          status: 'PENDING',
        },
      });

      return updatedSale;
    });

    return this.mapToResponse(sale);
  }

  /**
   * Get sales for retailer
   */
  async findByRetailer(retailerId: string, limit?: number): Promise<SaleResponseDto[]> {
    const sales = await this.prisma.sale.findMany({
      where: { retailerId },
      include: {
        material: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return sales.map(s => this.mapToResponse(s));
  }

  /**
   * Get sales summary for retailer dashboard
   */
  async getSummary(retailerId: string): Promise<SaleSummaryDto> {
    const [totalSales, aggregates, recentSales] = await Promise.all([
      this.prisma.sale.count({
        where: { retailerId },
      }),
      this.prisma.sale.aggregate({
        where: { retailerId },
        _sum: {
          unitsSold: true,
          totalAmount: true,
        },
      }),
      this.findByRetailer(retailerId, 10),
    ]);

    return {
      totalSales,
      totalUnitsSold: aggregates._sum.unitsSold || 0,
      totalRevenue: aggregates._sum.totalAmount
        ? parseFloat(aggregates._sum.totalAmount.toString())
        : 0,
      recentSales,
    };
  }

  /**
   * Get all sales - Admin only
   */
  async findAll(limit?: number): Promise<SaleResponseDto[]> {
    const sales = await this.prisma.sale.findMany({
      include: {
        material: { select: { name: true } },
        retailer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return sales.map(s => this.mapToResponse(s));
  }

  /**
   * Get sale by ID
   */
  async findOne(id: string): Promise<SaleResponseDto> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        material: { select: { name: true } },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return this.mapToResponse(sale);
  }

  /**
   * Map to response DTO
   */
  private mapToResponse(sale: any): SaleResponseDto {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      retailerId: sale.retailerId,
      materialId: sale.materialId,
      materialName: sale.material?.name || '',
      unitsSold: sale.unitsSold,
      unitPrice: parseFloat(sale.unitPrice.toString()),
      totalAmount: parseFloat(sale.totalAmount.toString()),
      packetsOpened: sale.packetsOpened,
      createdAt: sale.createdAt,
    };
  }
}