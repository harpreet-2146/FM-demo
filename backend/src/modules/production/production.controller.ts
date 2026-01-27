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
import { ProductionService } from './production.service';
import {
  CreateProductionBatchDto,
  ProductionBatchResponseDto,
  ProductionSummaryDto,
} from './dto/production.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  /**
   * Create a production batch
   * MANUFACTURER ONLY
   */
  @Post('batch')
  @Roles(Role.MANUFACTURER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create production batch (Manufacturer only)' })
  @ApiResponse({ status: 201, type: ProductionBatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data or inactive material' })
  @ApiResponse({ status: 409, description: 'Batch number already exists' })
  async createBatch(
    @Body() dto: CreateProductionBatchDto,
    @CurrentUser('id') manufacturerId: string,
  ): Promise<ProductionBatchResponseDto> {
    return this.productionService.create(dto, manufacturerId);
  }

  /**
   * Get production summary (dashboard)
   * MANUFACTURER ONLY
   */
  @Get('summary')
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get production summary (Manufacturer only)' })
  @ApiResponse({ status: 200, type: ProductionSummaryDto })
  async getSummary(
    @CurrentUser('id') manufacturerId: string,
  ): Promise<ProductionSummaryDto> {
    return this.productionService.getSummary(manufacturerId);
  }

  /**
   * Get all batches for current manufacturer
   * MANUFACTURER ONLY
   */
  @Get('batches')
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get my production batches (Manufacturer only)' })
  @ApiQuery({ name: 'materialId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [ProductionBatchResponseDto] })
  async getMyBatches(
    @CurrentUser('id') manufacturerId: string,
    @Query('materialId') materialId?: string,
    @Query('limit') limit?: string,
  ): Promise<ProductionBatchResponseDto[]> {
    return this.productionService.getByManufacturer(manufacturerId, {
      materialId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get batch by ID
   * MANUFACTURER ONLY - can only see own batches
   */
  @Get('batches/:id')
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get batch by ID (Manufacturer only)' })
  @ApiResponse({ status: 200, type: ProductionBatchResponseDto })
  @ApiResponse({ status: 404, description: 'Batch not found' })
  async getBatch(
    @Param('id') id: string,
    @CurrentUser('id') manufacturerId: string,
  ): Promise<ProductionBatchResponseDto> {
    return this.productionService.findOne(id, manufacturerId);
  }
}