import { IsString, IsNotEmpty, IsInt, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { GRNStatus } from '@prisma/client';

export class ConfirmGRNItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  materialId: string;

  @ApiProperty({ description: 'Actual packets received' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  receivedPackets: number;

  @ApiPropertyOptional({ description: 'Actual loose units received' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  receivedLooseUnits?: number;

  // damagedPackets REMOVED - use Returns workflow instead
}

export class ConfirmGRNDto {
  @ApiProperty({ type: [ConfirmGRNItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmGRNItemDto)
  items: ConfirmGRNItemDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class GRNItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  sqCode: string;

  @ApiProperty()
  expectedPackets: number;

  @ApiProperty()
  expectedLooseUnits: number;

  @ApiPropertyOptional()
  receivedPackets?: number;

  @ApiPropertyOptional()
  receivedLooseUnits?: number;

  // damagedPackets REMOVED - use Returns workflow instead
}

export class GRNResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  grnNumber: string;

  @ApiProperty()
  dispatchId: string;

  @ApiProperty()
  dispatchNumber: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty({ enum: GRNStatus })
  status: GRNStatus;

  @ApiProperty({ type: [GRNItemResponseDto] })
  items: GRNItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  hasInvoice: boolean;
}