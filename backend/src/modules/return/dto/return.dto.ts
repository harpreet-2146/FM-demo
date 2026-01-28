import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReturnReason, ReturnStatus } from '@prisma/client';

export class ReturnItemDto {
  @ApiProperty({ description: 'Material ID' })
  @IsString()
  @IsNotEmpty()
  materialId: string;

  @ApiPropertyOptional({ example: 5, description: 'Number of packets to return' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  packets?: number;

  @ApiPropertyOptional({ example: 10, description: 'Number of loose units to return' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  looseUnits?: number;
}

export class CreateReturnDto {
  @ApiProperty({ description: 'Manufacturer ID' })
  @IsString()
  @IsNotEmpty()
  manufacturerId: string;

  @ApiPropertyOptional({ description: 'GRN ID (optional - link to original receipt)' })
  @IsString()
  @IsOptional()
  grnId?: string;

  @ApiProperty({ enum: ReturnReason })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiPropertyOptional({ description: 'Additional details about the return' })
  @IsString()
  @IsOptional()
  reasonDetails?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}

export class ResolveReturnDto {
  @ApiProperty({ enum: ['APPROVED_RESTOCK', 'APPROVED_REPLACE', 'REJECTED'] })
  @IsEnum(['APPROVED_RESTOCK', 'APPROVED_REPLACE', 'REJECTED'])
  resolution: 'APPROVED_RESTOCK' | 'APPROVED_REPLACE' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Resolution notes' })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}

export class ReturnItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  sqCode: string;

  @ApiProperty()
  packets: number;

  @ApiProperty()
  looseUnits: number;
}

export class ReturnResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  returnNumber: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty()
  manufacturerId: string;

  @ApiProperty()
  manufacturerName: string;

  @ApiPropertyOptional()
  grnId?: string;

  @ApiPropertyOptional()
  grnNumber?: string;

  @ApiProperty({ enum: ReturnStatus })
  status: ReturnStatus;

  @ApiProperty({ enum: ReturnReason })
  reason: ReturnReason;

  @ApiPropertyOptional()
  reasonDetails?: string;

  @ApiProperty({ type: [ReturnItemResponseDto] })
  items: ReturnItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date;

  @ApiPropertyOptional()
  resolvedBy?: string;

  @ApiPropertyOptional()
  resolverName?: string;

  @ApiPropertyOptional()
  resolutionNotes?: string;
}