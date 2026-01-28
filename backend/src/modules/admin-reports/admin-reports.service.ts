import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  ManufacturerInventoryReportDto,
  MaterialInventoryReportDto,
  InventorySummaryReportDto,
  RetailerInventoryReportDto,
} from './dto/admin-reports.dto';

/**
 * Admin Reports Service
 * Read-only reporting views for Admin dashboard
 * No inventory mutations - pure aggregation queries
 */
@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overall inventory summary
   */
  async getInventorySummary(): Promise<InventorySummaryReportDto> {
    // Get all manufacturers with inventory
    const manufacturers = await this.prisma.user.findMany({
      where: { role: 'MANUFACTURER', isActive: true },
      select: { id: true, name: true },
    });

    const byManufacturer: ManufacturerInventoryReportDto[] = [];

    let totalPackets = 0;
    let totalBlockedPackets = 0;
    let totalLooseUnits = 0;
    let totalBlockedLooseUnits = 0;
    let totalMaterialsSet = new Set<string>();

    for (const manufacturer of manufacturers) {
      const inventory = await this.prisma.manufacturerInventory.findMany({
        where: { manufacturerId: manufacturer.id },
      });

      let mfrPackets = 0;
      let mfrBlockedPackets = 0;
      let mfrLooseUnits = 0;
      let mfrBlockedLooseUnits = 0;

      for (const inv of inventory) {
        mfrPackets += inv.fullPackets;
        mfrBlockedPackets += inv.blockedPackets;
        mfrLooseUnits += inv.looseUnits;
        mfrBlockedLooseUnits += inv.blockedLooseUnits;
        totalMaterialsSet.add(inv.materialId);
      }

      totalPackets += mfrPackets;
      totalBlockedPackets += mfrBlockedPackets;
      totalLooseUnits += mfrLooseUnits;
      totalBlockedLooseUnits += mfrBlockedLooseUnits;

      if (inventory.length > 0) {
        byManufacturer.push({
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          totalMaterials: inventory.length,
          totalPackets: mfrPackets,
          blockedPackets: mfrBlockedPackets,
          availablePackets: mfrPackets - mfrBlockedPackets,
          totalLooseUnits: mfrLooseUnits,
          blockedLooseUnits: mfrBlockedLooseUnits,
          availableLooseUnits: mfrLooseUnits - mfrBlockedLooseUnits,
        });
      }
    }

    return {
      totalManufacturers: byManufacturer.length,
      totalMaterials: totalMaterialsSet.size,
      totalPackets,
      totalBlockedPackets,
      totalLooseUnits,
      totalBlockedLooseUnits,
      byManufacturer,
    };
  }

  /**
   * Get inventory report by manufacturer
   */
  async getInventoryByManufacturer(): Promise<ManufacturerInventoryReportDto[]> {
    const summary = await this.getInventorySummary();
    return summary.byManufacturer;
  }

  /**
   * Get inventory for a specific manufacturer
   */
  async getManufacturerInventoryDetail(manufacturerId: string) {
    const manufacturer = await this.prisma.user.findUnique({
      where: { id: manufacturerId },
      select: { id: true, name: true, role: true },
    });

    if (!manufacturer || manufacturer.role !== 'MANUFACTURER') {
      return null;
    }

    const inventory = await this.prisma.manufacturerInventory.findMany({
      where: { manufacturerId },
      include: {
        material: { select: { name: true, sqCode: true, unitsPerPacket: true } },
      },
      orderBy: { material: { name: 'asc' } },
    });

    return {
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.name,
      items: inventory.map(inv => ({
        materialId: inv.materialId,
        sqCode: inv.material?.sqCode || '',
        materialName: inv.material?.name || '',
        unitsPerPacket: inv.material?.unitsPerPacket || 0,
        totalPackets: inv.fullPackets,
        blockedPackets: inv.blockedPackets,
        availablePackets: inv.fullPackets - inv.blockedPackets,
        totalLooseUnits: inv.looseUnits,
        blockedLooseUnits: inv.blockedLooseUnits,
        availableLooseUnits: inv.looseUnits - inv.blockedLooseUnits,
      })),
    };
  }

  /**
   * Get inventory report by material
   */
  async getInventoryByMaterial(): Promise<MaterialInventoryReportDto[]> {
    const materials = await this.prisma.material.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sqCode: true },
    });

    const reports: MaterialInventoryReportDto[] = [];

    for (const material of materials) {
      const inventory = await this.prisma.manufacturerInventory.findMany({
        where: { materialId: material.id },
        include: {
          manufacturer: { select: { id: true, name: true } },
        },
      });

      if (inventory.length === 0) continue;

      let totalPackets = 0;
      let totalLooseUnits = 0;
      const breakdown = [];

      for (const inv of inventory) {
        totalPackets += inv.fullPackets;
        totalLooseUnits += inv.looseUnits;

        breakdown.push({
          manufacturerId: inv.manufacturer.id,
          manufacturerName: inv.manufacturer.name,
          packets: inv.fullPackets,
          blockedPackets: inv.blockedPackets,
          looseUnits: inv.looseUnits,
          blockedLooseUnits: inv.blockedLooseUnits,
        });
      }

      reports.push({
        materialId: material.id,
        sqCode: material.sqCode,
        materialName: material.name,
        totalPacketsAcrossManufacturers: totalPackets,
        totalLooseUnitsAcrossManufacturers: totalLooseUnits,
        manufacturerBreakdown: breakdown,
      });
    }

    return reports;
  }

  /**
   * Get retailer inventory summary (read-only view for Admin)
   */
  async getRetailerInventorySummary(): Promise<RetailerInventoryReportDto[]> {
    const retailers = await this.prisma.user.findMany({
      where: { role: 'RETAILER', isActive: true },
      select: { id: true, name: true },
    });

    const reports: RetailerInventoryReportDto[] = [];

    for (const retailer of retailers) {
      const inventory = await this.prisma.retailerInventory.findMany({
        where: { retailerId: retailer.id },
      });

      if (inventory.length === 0) continue;

      let totalPackets = 0;
      let totalLooseUnits = 0;

      for (const inv of inventory) {
        totalPackets += inv.fullPackets;
        totalLooseUnits += inv.looseUnits;
      }

      reports.push({
        retailerId: retailer.id,
        retailerName: retailer.name,
        totalMaterials: inventory.length,
        totalPackets,
        totalLooseUnits,
      });
    }

    return reports;
  }
}