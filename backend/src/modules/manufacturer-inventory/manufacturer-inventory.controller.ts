import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ManufacturerInventoryService } from './manufacturer-inventory.service';
import { ManufacturerInventorySummaryDto } from './dto/manufacturer-inventory.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Manufacturer Inventory')
@ApiBearerAuth()
@Controller('manufacturer/inventory')
export class ManufacturerInventoryController {
  constructor(private readonly inventoryService: ManufacturerInventoryService) {}

  /**
   * Get current manufacturer's inventory
   * MANUFACTURER ONLY - sees only their own inventory
   * No financial data exposed
   */
  @Get()
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get my inventory (Manufacturer only)' })
  @ApiResponse({ status: 200, type: ManufacturerInventorySummaryDto })
  async getMyInventory(
    @CurrentUser('id') manufacturerId: string,
  ): Promise<ManufacturerInventorySummaryDto> {
    return this.inventoryService.getByManufacturer(manufacturerId);
  }
}