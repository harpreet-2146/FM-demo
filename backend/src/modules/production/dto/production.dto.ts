import { IsString, IsNotEmpty, IsInt, IsPositive, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductionBatchDto {
  @ApiPropertyOptional({ description: 'Material ID (provide either materialId or sqCode)' })
  @IsString()
  @IsOptional()
  materialId?: string;

  @ApiPropertyOptional({ description: 'Material SQ Code (provide either materialId or sqCode)' })
  @IsString()
  @IsOptional()
  sqCode?: string;

  @ApiProperty({ example: 'BATCH-2024-001', description: 'Unique batch number' })
  @IsString()
  @IsNotEmpty({ message: 'Batch number is required' })
  batchNumber: string;

  @ApiProperty({ example: '2024-01-15', description: 'Manufacture date' })
  @IsDateString({}, { message: 'Invalid manufacture date format' })
  @IsNotEmpty({ message: 'Manufacture date is required' })
  manufactureDate: string;

  @ApiProperty({ example: '2025-01-15', description: 'Expiry date' })
  @IsDateString({}, { message: 'Invalid expiry date format' })
  @IsNotEmpty({ message: 'Expiry date is required' })
  expiryDate: string;

  @ApiProperty({ example: 100, description: 'Number of packets produced' })
  @IsInt({ message: 'Packets produced must be an integer' })
  @Min(0, { message: 'Packets produced cannot be negative' })
  @Type(() => Number)
  packetsProduced: number;

  @ApiPropertyOptional({ example: 50, description: 'Number of loose units produced' })
  @IsInt({ message: 'Loose units produced must be an integer' })
  @Min(0, { message: 'Loose units produced cannot be negative' })
  @IsOptional()
  @Type(() => Number)
  looseUnitsProduced?: number;
}

export class ProductionBatchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  sqCode: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  manufacturerId: string;

  @ApiProperty()
  batchNumber: string;

  @ApiProperty()
  manufactureDate: Date;

  @ApiProperty()
  expiryDate: Date;

  @ApiProperty()
  packetsProduced: number;

  @ApiProperty()
  looseUnitsProduced: number;

  @ApiProperty()
  hsnCodeSnapshot: string;

  @ApiProperty()
  createdAt: Date;
}

export class ProductionSummaryDto {
  @ApiProperty()
  totalBatches: number;

  @ApiProperty()
  totalPacketsProduced: number;

  @ApiProperty()
  totalLooseUnitsProduced: number;

  @ApiProperty({ type: [ProductionBatchResponseDto] })
  recentBatches: ProductionBatchResponseDto[];
}