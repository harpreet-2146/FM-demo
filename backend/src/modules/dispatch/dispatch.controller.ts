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
import { DispatchService } from './dispatch.service';
import {
  CreateDispatchOrderDto,
  ExecuteDispatchDto,
  DispatchOrderResponseDto,
  DispatchOrderAdminResponseDto,
} from './dto/dispatch.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';
import { DispatchStatus } from '@prisma/client';

@ApiTags('Dispatch')
@ApiBearerAuth()
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  /**
   * Create dispatch order from approved SRN
   * ADMIN ONLY
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create dispatch order (Admin only)' })
  @ApiResponse({ status: 201, type: DispatchOrderAdminResponseDto })
  @ApiResponse({ status: 400, description: 'SRN not approved or dispatch exists' })
  async create(
    @Body() dto: CreateDispatchOrderDto,
    @CurrentUser('id') adminId: string,
  ): Promise<DispatchOrderAdminResponseDto> {
    return this.dispatchService.create(dto, adminId);
  }

  /**
   * Execute dispatch - ship goods
   * MANUFACTURER ONLY
   */
  @Post(':id/execute')
  @Roles(Role.MANUFACTURER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute dispatch (Manufacturer only)' })
  @ApiResponse({ status: 200, type: DispatchOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Dispatch not pending' })
  @ApiResponse({ status: 403, description: 'Not your dispatch order' })
  async execute(
    @Param('id') id: string,
    @Body() dto: ExecuteDispatchDto,
    @CurrentUser('id') manufacturerId: string,
  ): Promise<DispatchOrderResponseDto> {
    return this.dispatchService.execute(id, dto, manufacturerId);
  }

  /**
   * Get my dispatch orders
   * MANUFACTURER ONLY - no financial data
   */
  @Get('my')
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get my dispatch orders (Manufacturer only)' })
  @ApiResponse({ status: 200, type: [DispatchOrderResponseDto] })
  async getMyDispatches(
    @CurrentUser('id') manufacturerId: string,
  ): Promise<DispatchOrderResponseDto[]> {
    return this.dispatchService.findByManufacturer(manufacturerId);
  }

  /**
   * Get all dispatch orders
   * ADMIN ONLY - includes financial data
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all dispatch orders (Admin only)' })
  @ApiQuery({ name: 'status', enum: DispatchStatus, required: false })
  @ApiResponse({ status: 200, type: [DispatchOrderAdminResponseDto] })
  async findAll(
    @Query('status') status?: DispatchStatus,
  ): Promise<DispatchOrderAdminResponseDto[]> {
    return this.dispatchService.findAll(status);
  }

  /**
   * Get dispatch by ID
   * ADMIN sees financial data, MANUFACTURER does not
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get dispatch order by ID' })
  @ApiResponse({ status: 200, type: DispatchOrderResponseDto })
  @ApiResponse({ status: 404, description: 'Dispatch not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ): Promise<DispatchOrderResponseDto | DispatchOrderAdminResponseDto> {
    if (user.role === Role.ADMIN) {
      return this.dispatchService.findOneAdmin(id);
    }
    return this.dispatchService.findOne(id, user.id);
  }
}