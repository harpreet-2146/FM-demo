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
import { GRNService } from './grn.service';
import { ConfirmGRNDto, GRNResponseDto } from './dto/grn.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';
import { GRNStatus } from '@prisma/client';

@ApiTags('Goods Receipt Notes (GRN)')
@ApiBearerAuth()
@Controller('grn')
export class GRNController {
  constructor(private readonly grnService: GRNService) {}

  /**
   * Confirm GRN - receive goods
   * RETAILER ONLY
   */
  @Post(':id/confirm')
  @Roles(Role.RETAILER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm GRN receipt (Retailer only)' })
  @ApiResponse({ status: 200, type: GRNResponseDto })
  @ApiResponse({ status: 400, description: 'GRN already processed' })
  @ApiResponse({ status: 403, description: 'Not your GRN' })
  async confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmGRNDto,
    @CurrentUser('id') retailerId: string,
  ): Promise<GRNResponseDto> {
    return this.grnService.confirm(id, dto, retailerId);
  }

  /**
   * Get my GRNs
   * RETAILER ONLY
   */
  @Get('my')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my GRNs (Retailer only)' })
  @ApiQuery({ name: 'status', enum: GRNStatus, required: false })
  @ApiResponse({ status: 200, type: [GRNResponseDto] })
  async getMyGRNs(
    @CurrentUser('id') retailerId: string,
    @Query('status') status?: GRNStatus,
  ): Promise<GRNResponseDto[]> {
    return this.grnService.findByRetailer(retailerId, status);
  }

  /**
   * Get all GRNs
   * ADMIN ONLY
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all GRNs (Admin only)' })
  @ApiQuery({ name: 'status', enum: GRNStatus, required: false })
  @ApiResponse({ status: 200, type: [GRNResponseDto] })
  async findAll(@Query('status') status?: GRNStatus): Promise<GRNResponseDto[]> {
    return this.grnService.findAll(status);
  }

  /**
   * Get GRN by ID
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RETAILER)
  @ApiOperation({ summary: 'Get GRN by ID' })
  @ApiResponse({ status: 200, type: GRNResponseDto })
  @ApiResponse({ status: 404, description: 'GRN not found' })
  async findOne(@Param('id') id: string): Promise<GRNResponseDto> {
    return this.grnService.findOne(id);
  }
}