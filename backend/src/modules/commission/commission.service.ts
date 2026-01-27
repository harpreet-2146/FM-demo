import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CommissionResponseDto,
  CommissionSummaryDto,
  RetailerCommissionSummaryDto,
} from './dto/commission.dto';
import { CommissionStatus } from '@prisma/client';

/**
 * Commission Service
 * ADMIN ONLY - Manufacturer cannot access any commission data
 * Commission is decoupled from Invoice - tied to Sales only
 */
@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overall commission summary
   */
  async getSummary(): Promise<CommissionSummaryDto> {
    const [total, pending, paid, pendingSum, paidSum] = await Promise.all([
      this.prisma.commission.count(),
      this.prisma.commission.count({ where: { status: 'PENDING' } }),
      this.prisma.commission.count({ where: { status: 'PAID' } }),
      this.prisma.commission.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCommissions: total,
      totalPending: pending,
      totalPaid: paid,
      pendingAmount: pendingSum._sum.amount
        ? parseFloat(pendingSum._sum.amount.toString())
        : 0,
      paidAmount: paidSum._sum.amount
        ? parseFloat(paidSum._sum.amount.toString())
        : 0,
    };
  }

  /**
   * Get commission summary grouped by retailer
   */
  async getSummaryByRetailer(): Promise<RetailerCommissionSummaryDto[]> {
    const retailers = await this.prisma.user.findMany({
      where: { role: 'RETAILER', isActive: true },
      select: { id: true, name: true },
    });

    const summaries: RetailerCommissionSummaryDto[] = [];

    for (const retailer of retailers) {
      const [total, pendingCount, paidCount, pendingAgg, paidAgg] = await Promise.all([
        this.prisma.commission.count({ where: { retailerId: retailer.id } }),
        this.prisma.commission.count({
          where: { retailerId: retailer.id, status: 'PENDING' },
        }),
        this.prisma.commission.count({
          where: { retailerId: retailer.id, status: 'PAID' },
        }),
        this.prisma.commission.aggregate({
          where: { retailerId: retailer.id, status: 'PENDING' },
          _sum: { amount: true },
        }),
        this.prisma.commission.aggregate({
          where: { retailerId: retailer.id, status: 'PAID' },
          _sum: { amount: true },
        }),
      ]);

      if (total > 0) {
        summaries.push({
          retailerId: retailer.id,
          retailerName: retailer.name,
          totalCommissions: total,
          pendingCount,
          paidCount,
          pendingAmount: pendingAgg._sum.amount
            ? parseFloat(pendingAgg._sum.amount.toString())
            : 0,
          paidAmount: paidAgg._sum.amount
            ? parseFloat(paidAgg._sum.amount.toString())
            : 0,
        });
      }
    }

    return summaries;
  }

  /**
   * Get all commissions
   */
  async findAll(status?: CommissionStatus): Promise<CommissionResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const commissions = await this.prisma.commission.findMany({
      where,
      include: {
        sale: { select: { saleNumber: true } },
        retailer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return commissions.map(c => this.mapToResponse(c));
  }

  /**
   * Get commissions for a specific retailer
   */
  async findByRetailer(
    retailerId: string,
    status?: CommissionStatus,
  ): Promise<CommissionResponseDto[]> {
    const where: any = { retailerId };
    if (status) {
      where.status = status;
    }

    const commissions = await this.prisma.commission.findMany({
      where,
      include: {
        sale: { select: { saleNumber: true } },
        retailer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return commissions.map(c => this.mapToResponse(c));
  }

  /**
   * Mark commission as paid
   * ADMIN ONLY
   */
  async markPaid(id: string): Promise<CommissionResponseDto> {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Commission not found');
    }

    if (commission.status === 'PAID') {
      throw new NotFoundException('Commission already paid');
    }

    const updated = await this.prisma.commission.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: {
        sale: { select: { saleNumber: true } },
        retailer: { select: { name: true } },
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Bulk mark commissions as paid for a retailer
   * ADMIN ONLY
   */
  async markAllPaidForRetailer(retailerId: string): Promise<number> {
    const result = await this.prisma.commission.updateMany({
      where: {
        retailerId,
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Map to response DTO
   */
  private mapToResponse(commission: any): CommissionResponseDto {
    return {
      id: commission.id,
      saleId: commission.saleId,
      saleNumber: commission.sale?.saleNumber || '',
      retailerId: commission.retailerId,
      retailerName: commission.retailer?.name || '',
      commissionType: commission.commissionType,
      commissionRate: parseFloat(commission.commissionRate.toString()),
      unitsSold: commission.unitsSold,
      amount: parseFloat(commission.amount.toString()),
      status: commission.status,
      paidAt: commission.paidAt,
      createdAt: commission.createdAt,
    };
  }
}