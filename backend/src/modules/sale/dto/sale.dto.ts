import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSaleDto {
  @ApiProperty({ description: 'Material ID' })
  @IsString()
  @IsNotEmpty()
  materialId: string;

  @ApiProperty({ example: 5, description: 'Number of units sold' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  unitsSold: number;
}

export class SaleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  saleNumber: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  unitsSold: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  packetsOpened: number;

  @ApiProperty()
  createdAt: Date;
}

export class SaleSummaryDto {
  @ApiProperty()
  totalSales: number;

  @ApiProperty()
  totalUnitsSold: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty({ type: [SaleResponseDto] })
  recentSales: SaleResponseDto[];
}