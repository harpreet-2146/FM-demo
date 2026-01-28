import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import {
  ManufacturerInventoryReportDto,
  MaterialInventoryReportDto,
  InventorySummaryReportDto,
  RetailerInventoryReportDto,
} from './dto/admin-reports.dto';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

/**
 * Admin Reports Controller
 * Read-only inventory reporting for Admin dashboard
 * ADMIN ONLY - No inventory mutations
 */
@ApiTags('Admin Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@Roles(Role.ADMIN)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  /**
   * Get overall inventory summary
   */
  @Get('inventory/summary')
  @ApiOperation({ summary: 'Get overall inventory summary (Admin only)' })
  @ApiResponse({ status: 200, type: InventorySummaryReportDto })
  async getInventorySummary(): Promise<InventorySummaryReportDto> {
    return this.reportsService.getInventorySummary();
  }

  /**
   * Get inventory grouped by manufacturer
   */
  @Get('inventory/by-manufacturer')
  @ApiOperation({ summary: 'Get inventory by manufacturer (Admin only)' })
  @ApiResponse({ status: 200, type: [ManufacturerInventoryReportDto] })
  async getInventoryByManufacturer(): Promise<ManufacturerInventoryReportDto[]> {
    return this.reportsService.getInventoryByManufacturer();
  }

  /**
   * Get detailed inventory for specific manufacturer
   */
  @Get('inventory/manufacturer/:manufacturerId')
  @ApiOperation({ summary: 'Get detailed inventory for manufacturer (Admin only)' })
  @ApiResponse({ status: 200 })
  async getManufacturerInventoryDetail(@Param('manufacturerId') manufacturerId: string) {
    return this.reportsService.getManufacturerInventoryDetail(manufacturerId);
  }

  /**
   * Get inventory grouped by material
   */
  @Get('inventory/by-material')
  @ApiOperation({ summary: 'Get inventory by material (Admin only)' })
  @ApiResponse({ status: 200, type: [MaterialInventoryReportDto] })
  async getInventoryByMaterial(): Promise<MaterialInventoryReportDto[]> {
    return this.reportsService.getInventoryByMaterial();
  }

  /**
   * Get retailer inventory summary
   */
  @Get('inventory/retailers')
  @ApiOperation({ summary: 'Get retailer inventory summary (Admin only)' })
  @ApiResponse({ status: 200, type: [RetailerInventoryReportDto] })
  async getRetailerInventorySummary(): Promise<RetailerInventoryReportDto[]> {
    return this.reportsService.getRetailerInventorySummary();
  }
}