import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, UpdateMaterialDto, MaterialResponseDto } from './dto/material.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Materials')
@ApiBearerAuth()
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  /**
   * Create a new material
   * ADMIN ONLY - All fields required, no defaults
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new material (Admin only)' })
  @ApiResponse({ status: 201, type: MaterialResponseDto })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 409, description: 'SQ Code already exists' })
  async create(
    @Body() dto: CreateMaterialDto,
    @CurrentUser('id') adminId: string,
  ): Promise<MaterialResponseDto> {
    return this.materialsService.create(dto, adminId);
  }

  /**
   * Get all materials
   * Admin sees all (including inactive)
   * Retailer sees only active (catalog)
   * Manufacturer sees only active
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANUFACTURER, Role.RETAILER)
  @ApiOperation({ summary: 'Get all materials' })
  @ApiQuery({ name: 'includeInactive', type: Boolean, required: false, description: 'Admin only' })
  @ApiResponse({ status: 200, type: [MaterialResponseDto] })
  async findAll(
    @CurrentUser('role') userRole: Role,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<MaterialResponseDto[]> {
    // Only Admin can see inactive materials
    const showInactive = userRole === Role.ADMIN && includeInactive === 'true';
    return this.materialsService.findAll(showInactive);
  }

  /**
   * Get material by SQ Code
   */
  @Get('by-sqcode/:sqCode')
  @Roles(Role.ADMIN, Role.MANUFACTURER, Role.RETAILER)
  @ApiOperation({ summary: 'Get material by SQ Code' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findBySqCode(@Param('sqCode') sqCode: string): Promise<MaterialResponseDto> {
    return this.materialsService.findBySqCode(sqCode);
  }

  /**
   * Get material by ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANUFACTURER, Role.RETAILER)
  @ApiOperation({ summary: 'Get material by ID' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async findOne(@Param('id') id: string): Promise<MaterialResponseDto> {
    return this.materialsService.findOne(id);
  }

  /**
   * Update material
   * ADMIN ONLY
   * RULES:
   * - sqCode is NEVER updatable
   * - unitsPerPacket is NEVER updatable
   * - hsnCode and gstRate locked after production
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update material (Admin only)' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  @ApiResponse({ status: 403, description: 'Cannot modify locked fields after production' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    return this.materialsService.update(id, dto);
  }

  /**
   * Deactivate material
   * ADMIN ONLY
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate material (Admin only)' })
  @ApiResponse({ status: 204, description: 'Material deactivated' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async deactivate(@Param('id') id: string): Promise<void> {
    return this.materialsService.deactivate(id);
  }
}