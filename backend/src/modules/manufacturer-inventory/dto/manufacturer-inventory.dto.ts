import { ApiProperty } from '@nestjs/swagger';

export class ManufacturerInventoryResponseDto {
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

  @ApiProperty({ description: 'Available packets (not blocked)' })
  availablePackets: number;

  @ApiProperty({ description: 'Packets blocked for approved SRNs' })
  blockedPackets: number;

  @ApiProperty({ description: 'Total packets (available + blocked)' })
  totalPackets: number;

  @ApiProperty({ description: 'Available loose units (not blocked)' })
  availableLooseUnits: number;

  @ApiProperty({ description: 'Loose units blocked for approved SRNs' })
  blockedLooseUnits: number;

  @ApiProperty({ description: 'Total loose units (available + blocked)' })
  totalLooseUnits: number;

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

  @ApiProperty()
  totalAvailableLooseUnits: number;

  @ApiProperty()
  totalBlockedLooseUnits: number;

  @ApiProperty({ type: [ManufacturerInventoryResponseDto] })
  items: ManufacturerInventoryResponseDto[];
}