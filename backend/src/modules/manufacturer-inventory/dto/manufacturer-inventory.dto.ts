import { ApiProperty } from '@nestjs/swagger';

export class ManufacturerInventoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  materialId: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  manufacturerId: string;

  @ApiProperty({ description: 'Available packets (not blocked)' })
  availablePackets: number;

  @ApiProperty({ description: 'Packets blocked for approved SRNs' })
  blockedPackets: number;

  @ApiProperty({ description: 'Total packets (available + blocked)' })
  totalPackets: number;

  @ApiProperty()
  updatedAt: Date;
}

export class ManufacturerInventorySummaryDto {
  @ApiProperty()
  totalMaterials: number;

  @ApiProperty()
  totalAvailablePackets: number;

  @ApiProperty()
  totalBlockedPackets: number;

  @ApiProperty({ type: [ManufacturerInventoryResponseDto] })
  items: ManufacturerInventoryResponseDto[];
}