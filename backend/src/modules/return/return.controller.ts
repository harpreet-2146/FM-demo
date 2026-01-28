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
import { ReturnService } from './return.service';
import {
  CreateReturnDto,
  ResolveReturnDto,
  ReturnResponseDto,
} from './dto/return.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';
import { ReturnStatus } from '@prisma/client';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnController {
  constructor(private readonly returnService: ReturnService) {}

  /**
   * Create a return request
   * RETAILER ONLY
   */
  @Post()
  @Roles(Role.RETAILER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create return request (Retailer only)' })
  @ApiResponse({ status: 201, type: ReturnResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(
    @Body() dto: CreateReturnDto,
    @CurrentUser('id') retailerId: string,
  ): Promise<ReturnResponseDto> {
    return this.returnService.create(dto, retailerId);
  }

  /**
   * Resolve a return
   * ADMIN ONLY
   */
  @Post(':id/resolve')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve return (Admin only)' })
  @ApiResponse({ status: 200, type: ReturnResponseDto })
  @ApiResponse({ status: 400, description: 'Return already resolved' })
  @ApiResponse({ status: 404, description: 'Return not found' })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReturnDto,
    @CurrentUser('id') adminId: string,
  ): Promise<ReturnResponseDto> {
    return this.returnService.resolve(id, dto, adminId);
  }

  /**
   * Mark return as under review
   * ADMIN ONLY
   */
  @Post(':id/review')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark return as under review (Admin only)' })
  @ApiResponse({ status: 200, type: ReturnResponseDto })
  async markUnderReview(@Param('id') id: string): Promise<ReturnResponseDto> {
    return this.returnService.markUnderReview(id);
  }

  /**
   * Get my returns
   * RETAILER ONLY
   */
  @Get('my')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my returns (Retailer only)' })
  @ApiQuery({ name: 'status', enum: ReturnStatus, required: false })
  @ApiResponse({ status: 200, type: [ReturnResponseDto] })
  async getMyReturns(
    @CurrentUser('id') retailerId: string,
    @Query('status') status?: ReturnStatus,
  ): Promise<ReturnResponseDto[]> {
    return this.returnService.findByRetailer(retailerId, status);
  }

  /**
   * Get returns for my products
   * MANUFACTURER ONLY
   */
  @Get('manufacturer')
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get returns for my products (Manufacturer only)' })
  @ApiQuery({ name: 'status', enum: ReturnStatus, required: false })
  @ApiResponse({ status: 200, type: [ReturnResponseDto] })
  async getManufacturerReturns(
    @CurrentUser('id') manufacturerId: string,
    @Query('status') status?: ReturnStatus,
  ): Promise<ReturnResponseDto[]> {
    return this.returnService.findByManufacturer(manufacturerId, status);
  }

  /**
   * Get all returns
   * ADMIN ONLY
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all returns (Admin only)' })
  @ApiQuery({ name: 'status', enum: ReturnStatus, required: false })
  @ApiResponse({ status: 200, type: [ReturnResponseDto] })
  async findAll(@Query('status') status?: ReturnStatus): Promise<ReturnResponseDto[]> {
    return this.returnService.findAll(status);
  }

  /**
   * Get pending returns count
   * ADMIN ONLY
   */
  @Get('pending/count')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get pending returns count (Admin only)' })
  @ApiResponse({ status: 200 })
  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.returnService.getPendingCount();
    return { count };
  }

  /**
   * Get return by ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RETAILER, Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get return by ID' })
  @ApiResponse({ status: 200, type: ReturnResponseDto })
  @ApiResponse({ status: 404, description: 'Return not found' })
  async findOne(@Param('id') id: string): Promise<ReturnResponseDto> {
    return this.returnService.findOne(id);
  }
}