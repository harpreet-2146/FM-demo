import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT_PER_UNIT = 'FLAT_PER_UNIT',
}

/**
 * Create Material DTO
 * ALL FIELDS REQUIRED - No defaults, no hardcoding
 */
export class CreateMaterialDto {
  @ApiProperty({ example: 'Chocolate Chip Cookies', description: 'Material name' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Premium chocolate chip cookies', description: 'Material description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '19052031', description: 'HSN Code - Admin defined, no default' })
  @IsString()
  @IsNotEmpty({ message: 'HSN code is required - no default value allowed' })
  hsnCode: string;

  @ApiProperty({ example: 18, description: 'GST Rate percentage - Admin defined, no default' })
  @IsNumber({}, { message: 'GST rate must be a number' })
  @Min(0, { message: 'GST rate cannot be negative' })
  @Type(() => Number)
  gstRate: number;

  @ApiProperty({ example: 12, description: 'Units per packet - IMMUTABLE after creation' })
  @IsInt({ message: 'Units per packet must be an integer' })
  @IsPositive({ message: 'Units per packet must be positive' })
  @Type(() => Number)
  unitsPerPacket: number;

  @ApiProperty({ example: 120.00, description: 'MRP per packet in INR' })
  @IsNumber({}, { message: 'MRP must be a number' })
  @IsPositive({ message: 'MRP must be positive' })
  @Type(() => Number)
  mrpPerPacket: number;

  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE, description: 'Commission type' })
  @IsEnum(CommissionType, { message: 'Commission type must be PERCENTAGE or FLAT_PER_UNIT' })
  @IsNotEmpty({ message: 'Commission type is required' })
  commissionType: CommissionType;

  @ApiProperty({ example: 10, description: 'Commission value (% or flat amount per unit)' })
  @IsNumber({}, { message: 'Commission value must be a number' })
  @Min(0, { message: 'Commission value cannot be negative' })
  @Type(() => Number)
  commissionValue: number;
}

/**
 * Update Material DTO
 * CANNOT update: unitsPerPacket (always immutable)
 * CANNOT update after production: hsnCode, gstRate
 */
export class UpdateMaterialDto {
  @ApiPropertyOptional({ example: 'Premium Chocolate Chip Cookies' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: '19052031', description: 'HSN Code - LOCKED after production' })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiPropertyOptional({ example: 12, description: 'GST Rate - LOCKED after production' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  gstRate?: number;

  @ApiPropertyOptional({ example: 150.00, description: 'MRP per packet - Can always be updated' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  mrpPerPacket?: number;

  @ApiPropertyOptional({ enum: CommissionType })
  @IsEnum(CommissionType)
  @IsOptional()
  commissionType?: CommissionType;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  commissionValue?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;

  // NOTE: unitsPerPacket is NOT included - it is ALWAYS immutable
}

export class MaterialResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  hsnCode: string;

  @ApiProperty()
  gstRate: number;

  @ApiProperty({ description: 'IMMUTABLE - cannot be changed after creation' })
  unitsPerPacket: number;

  @ApiProperty()
  mrpPerPacket: number;

  @ApiProperty()
  unitPrice: number; // Calculated: mrpPerPacket / unitsPerPacket

  @ApiProperty({ enum: CommissionType })
  commissionType: CommissionType;

  @ApiProperty()
  commissionValue: number;

  @ApiProperty({ description: 'True if production has started - locks HSN and GST' })
  hasProduction: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}