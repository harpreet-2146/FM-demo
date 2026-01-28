import { ApiProperty } from '@nestjs/swagger';

export class ManufacturerInventoryReportDto {
  @ApiProperty()
  manufacturerId: string;

  @ApiProperty()
  manufacturerName: string;

  @ApiProperty()
  totalMaterials: number;

  @ApiProperty()
  totalPackets: number;

  @ApiProperty()
  blockedPackets: number;

  @ApiProperty()
  availablePackets: number;

  @ApiProperty()
  totalLooseUnits: number;

  @ApiProperty()
  blockedLooseUnits: number;

  @ApiProperty()
  availableLooseUnits: number;
}

export class MaterialInventoryReportDto {
  @ApiProperty()
  materialId: string;

  @ApiProperty()
  sqCode: string;

  @ApiProperty()
  materialName: string;

  @ApiProperty()
  totalPacketsAcrossManufacturers: number;

  @ApiProperty()
  totalLooseUnitsAcrossManufacturers: number;

  @ApiProperty()
  manufacturerBreakdown: {
    manufacturerId: string;
    manufacturerName: string;
    packets: number;
    blockedPackets: number;
    looseUnits: number;
    blockedLooseUnits: number;
  }[];
}

export class InventorySummaryReportDto {
  @ApiProperty()
  totalManufacturers: number;

  @ApiProperty()
  totalMaterials: number;

  @ApiProperty()
  totalPackets: number;

  @ApiProperty()
  totalBlockedPackets: number;

  @ApiProperty()
  totalLooseUnits: number;

  @ApiProperty()
  totalBlockedLooseUnits: number;

  @ApiProperty({ type: [ManufacturerInventoryReportDto] })
  byManufacturer: ManufacturerInventoryReportDto[];
}

export class RetailerInventoryReportDto {
  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty()
  totalMaterials: number;

  @ApiProperty()
  totalPackets: number;

  @ApiProperty()
  totalLooseUnits: number;
}