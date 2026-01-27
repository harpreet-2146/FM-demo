import { IsString, IsNotEmpty, IsInt, IsPositive, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductionBatchDto {
  @ApiProperty({ description: 'Material ID' })
  @IsString()
  @IsNotEmpty({ message: 'Material ID is required' })
  materialId: string;

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
  @IsPositive({ message: 'Packets produced must be positive' })
  @Type(() => Number)
  packetsProduced: number;
}

export class ProductionBatchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

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
  hsnCodeSnapshot: string;

  @ApiProperty()
  createdAt: Date;
}

export class ProductionSummaryDto {
  @ApiProperty()
  totalBatches: number;

  @ApiProperty()
  totalPacketsProduced: number;

  @ApiProperty({ type: [ProductionBatchResponseDto] })
  recentBatches: ProductionBatchResponseDto[];
}