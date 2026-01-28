import { ApiProperty } from '@nestjs/swagger';

export class RetailerInventoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  sqCode: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty({ description: 'Unopened packets' })
  fullPackets: number;

  @ApiProperty({ description: 'Loose units from opened packets' })
  looseUnits: number;

  @ApiProperty({ description: 'Units per packet for this material' })
  unitsPerPacket: number;

  @ApiProperty({ description: 'Total units available (packets * unitsPerPacket + looseUnits)' })
  totalUnits: number;

  @ApiProperty()
  updatedAt: Date;
}

export class RetailerInventorySummaryDto {
  @ApiProperty()
  totalMaterials: number;

  @ApiProperty()
  totalPackets: number;

  @ApiProperty()
  totalLooseUnits: number;

  @ApiProperty({ type: [RetailerInventoryResponseDto] })
  items: RetailerInventoryResponseDto[];
}