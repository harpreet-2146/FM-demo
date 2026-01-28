import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DispatchStatus } from '@prisma/client';

export class CreateDispatchOrderDto {
  @ApiProperty({ description: 'SRN ID to create dispatch from' })
  @IsString()
  @IsNotEmpty()
  srnId: string;

  @ApiPropertyOptional({ description: 'Delivery notes' })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;
}

export class ExecuteDispatchDto {
  @ApiPropertyOptional({ description: 'Delivery notes' })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;
}

export class DispatchItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  sqCode: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  packets: number;

  @ApiProperty()
  looseUnits: number;
}

export class DispatchItemAdminResponseDto extends DispatchItemResponseDto {
  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  lineTotal: number;

  @ApiProperty()
  hsnCode: string;

  @ApiProperty()
  gstRate: number;
}

// Response for Manufacturer - NO financial data
export class DispatchOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  dispatchNumber: string;

  @ApiProperty()
  srnId: string;

  @ApiProperty()
  srnNumber: string;

  @ApiProperty()
  manufacturerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty({ enum: DispatchStatus })
  status: DispatchStatus;

  @ApiProperty()
  totalPackets: number;

  @ApiProperty()
  totalLooseUnits: number;

  @ApiProperty({ type: [DispatchItemResponseDto] })
  items: DispatchItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  executedAt?: Date;

  @ApiPropertyOptional()
  deliveryNotes?: string;
}

// Response for Admin - includes financial data
export class DispatchOrderAdminResponseDto extends DispatchOrderResponseDto {
  @ApiProperty()
  subtotal: number;

  @ApiProperty({ type: [DispatchItemAdminResponseDto] })
  items: DispatchItemAdminResponseDto[];

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdByName: string;
}