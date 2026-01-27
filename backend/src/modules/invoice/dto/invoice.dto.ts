import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateInvoiceDto {
  @ApiProperty({ description: 'GRN ID to generate invoice from' })
  @IsString()
  @IsNotEmpty()
  grnId: string;

  @ApiPropertyOptional({ description: 'Is interstate transaction (for IGST)' })
  @IsBoolean()
  @IsOptional()
  isInterstate?: boolean;
}

export class InvoiceItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  hsnCode: string;

  @ApiProperty()
  gstRate: number;

  @ApiProperty()
  packets: number;

  @ApiProperty()
  unitsPerPacket: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  lineTotal: number;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  grnId: string;

  @ApiProperty()
  grnNumber: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty()
  subtotal: number;

  @ApiPropertyOptional()
  cgst?: number;

  @ApiPropertyOptional()
  sgst?: number;

  @ApiPropertyOptional()
  igst?: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  isInterstate: boolean;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];

  @ApiProperty()
  createdAt: Date;
}