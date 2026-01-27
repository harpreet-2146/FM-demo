import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RetailerInventoryService } from './retailer-inventory.service';
import { RetailerInventorySummaryDto } from './dto/retailer-inventory.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Retailer Inventory')
@ApiBearerAuth()
@Controller('retailer/inventory')
export class RetailerInventoryController {
  constructor(private readonly inventoryService: RetailerInventoryService) {}

  /**
   * Get current retailer's inventory
   * RETAILER ONLY
   */
  @Get()
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my inventory (Retailer only)' })
  @ApiResponse({ status: 200, type: RetailerInventorySummaryDto })
  async getMyInventory(
    @CurrentUser('id') retailerId: string,
  ): Promise<RetailerInventorySummaryDto> {
    return this.inventoryService.getByRetailer(retailerId);
  }
}