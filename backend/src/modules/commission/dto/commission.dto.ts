import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus, CommissionType } from '@prisma/client';

export class CommissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  saleId: string;

  @ApiProperty()
  saleNumber: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty({ enum: CommissionType })
  commissionType: CommissionType;

  @ApiProperty()
  commissionRate: number;

  @ApiProperty()
  unitsSold: number;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: CommissionStatus })
  status: CommissionStatus;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class CommissionSummaryDto {
  @ApiProperty()
  totalCommissions: number;

  @ApiProperty()
  totalPending: number;

  @ApiProperty()
  totalPaid: number;

  @ApiProperty()
  pendingAmount: number;

  @ApiProperty()
  paidAmount: number;
}

export class RetailerCommissionSummaryDto {
  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty()
  totalCommissions: number;

  @ApiProperty()
  pendingCount: number;

  @ApiProperty()
  paidCount: number;

  @ApiProperty()
  pendingAmount: number;

  @ApiProperty()
  paidAmount: number;
}