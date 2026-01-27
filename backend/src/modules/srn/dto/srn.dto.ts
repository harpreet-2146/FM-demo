import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SRNStatus } from '@prisma/client';

export class SRNItemDto {
  @ApiProperty({ description: 'Material ID' })
  @IsString()
  @IsNotEmpty()
  materialId: string;

  @ApiProperty({ example: 10, description: 'Number of packets requested' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  requestedPackets: number;
}

export class CreateSRNDto {
  @ApiProperty({ type: [SRNItemDto], description: 'Items to request' })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => SRNItemDto)
  items: SRNItemDto[];
}

export class ApprovalItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  materialId: string;

  @ApiProperty({ description: 'Approved packets (can be less than requested)' })
  @IsInt()
  @Type(() => Number)
  approvedPackets: number;
}

export class ApproveSRNDto {
  @ApiProperty({ enum: ['APPROVED', 'PARTIAL', 'REJECTED'] })
  @IsEnum(['APPROVED', 'PARTIAL', 'REJECTED'])
  action: 'APPROVED' | 'PARTIAL' | 'REJECTED';

  @ApiProperty({ description: 'Manufacturer to fulfill the order' })
  @IsString()
  @IsNotEmpty()
  manufacturerId: string;

  @ApiPropertyOptional({ type: [ApprovalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalItemDto)
  @IsOptional()
  items?: ApprovalItemDto[];

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsString()
  @IsOptional()
  rejectionNote?: string;
}

export class SRNItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  requestedPackets: number;

  @ApiPropertyOptional()
  approvedPackets?: number;
}

export class SRNResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  srnNumber: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty({ enum: SRNStatus })
  status: SRNStatus;

  @ApiProperty({ type: [SRNItemResponseDto] })
  items: SRNItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approverName?: string;

  @ApiPropertyOptional()
  rejectionNote?: string;
}