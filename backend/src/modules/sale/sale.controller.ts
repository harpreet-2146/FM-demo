import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SaleService } from './sale.service';
import { CreateSaleDto, SaleResponseDto, SaleSummaryDto } from './dto/sale.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  /**
   * Create a sale - B2C unit sale
   * RETAILER ONLY
   */
  @Post()
  @Roles(Role.RETAILER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a sale (Retailer only)' })
  @ApiResponse({ status: 201, type: SaleResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient inventory' })
  async create(
    @Body() dto: CreateSaleDto,
    @CurrentUser('id') retailerId: string,
  ): Promise<SaleResponseDto> {
    return this.saleService.create(dto, retailerId);
  }

  /**
   * Get sales summary for dashboard
   * RETAILER ONLY
   */
  @Get('summary')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get sales summary (Retailer only)' })
  @ApiResponse({ status: 200, type: SaleSummaryDto })
  async getSummary(
    @CurrentUser('id') retailerId: string,
  ): Promise<SaleSummaryDto> {
    return this.saleService.getSummary(retailerId);
  }

  /**
   * Get my sales
   * RETAILER ONLY
   */
  @Get('my')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my sales (Retailer only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [SaleResponseDto] })
  async getMySales(
    @CurrentUser('id') retailerId: string,
    @Query('limit') limit?: string,
  ): Promise<SaleResponseDto[]> {
    return this.saleService.findByRetailer(
      retailerId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * Get all sales
   * ADMIN ONLY
   * NOTE: Manufacturer CANNOT access sales data
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all sales (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [SaleResponseDto] })
  async findAll(@Query('limit') limit?: string): Promise<SaleResponseDto[]> {
    return this.saleService.findAll(limit ? parseInt(limit, 10) : undefined);
  }

  /**
   * Get sale by ID
   * ADMIN or RETAILER (own sales)
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RETAILER)
  @ApiOperation({ summary: 'Get sale by ID' })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async findOne(@Param('id') id: string): Promise<SaleResponseDto> {
    return this.saleService.findOne(id);
  }
}