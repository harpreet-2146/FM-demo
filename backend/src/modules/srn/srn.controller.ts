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
import { SRNService } from './srn.service';
import { CreateSRNDto, ApproveSRNDto, SRNResponseDto } from './dto/srn.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';
import { SRNStatus } from '@prisma/client';

@ApiTags('Stock Requisition Notes (SRN)')
@ApiBearerAuth()
@Controller('srn')
export class SRNController {
  constructor(private readonly srnService: SRNService) {}

  /**
   * Create a new SRN (draft)
   * RETAILER ONLY
   */
  @Post()
  @Roles(Role.RETAILER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new SRN (Retailer only)' })
  @ApiResponse({ status: 201, type: SRNResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid material or duplicate items' })
  async create(
    @Body() dto: CreateSRNDto,
    @CurrentUser('id') retailerId: string,
  ): Promise<SRNResponseDto> {
    return this.srnService.create(dto, retailerId);
  }

  /**
   * Submit SRN for approval
   * RETAILER ONLY
   */
  @Post(':id/submit')
  @Roles(Role.RETAILER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit SRN for approval (Retailer only)' })
  @ApiResponse({ status: 200, type: SRNResponseDto })
  @ApiResponse({ status: 400, description: 'SRN not in draft status' })
  @ApiResponse({ status: 403, description: 'Can only submit own SRNs' })
  async submit(
    @Param('id') id: string,
    @CurrentUser('id') retailerId: string,
  ): Promise<SRNResponseDto> {
    return this.srnService.submit(id, retailerId);
  }

  /**
   * Process SRN approval
   * ADMIN ONLY
   */
  @Post(':id/process')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve/Partial/Reject SRN (Admin only)' })
  @ApiResponse({ status: 200, type: SRNResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid approval data or insufficient inventory' })
  async processApproval(
    @Param('id') id: string,
    @Body() dto: ApproveSRNDto,
    @CurrentUser('id') adminId: string,
  ): Promise<SRNResponseDto> {
    return this.srnService.processApproval(id, dto, adminId);
  }

  /**
   * Get my SRNs (Retailer)
   * RETAILER ONLY
   */
  @Get('my')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my SRNs (Retailer only)' })
  @ApiQuery({ name: 'status', enum: SRNStatus, required: false })
  @ApiResponse({ status: 200, type: [SRNResponseDto] })
  async getMySRNs(
    @CurrentUser('id') retailerId: string,
    @Query('status') status?: SRNStatus,
  ): Promise<SRNResponseDto[]> {
    return this.srnService.findByRetailer(retailerId, status);
  }

  /**
   * Get all SRNs
   * ADMIN ONLY
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all SRNs (Admin only)' })
  @ApiQuery({ name: 'status', enum: SRNStatus, required: false })
  @ApiResponse({ status: 200, type: [SRNResponseDto] })
  async findAll(@Query('status') status?: SRNStatus): Promise<SRNResponseDto[]> {
    return this.srnService.findAll(status);
  }

  /**
   * Get pending SRNs count
   * ADMIN ONLY
   */
  @Get('pending/count')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get pending SRNs count (Admin only)' })
  @ApiResponse({ status: 200, type: Number })
  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.srnService.getPendingCount();
    return { count };
  }

  /**
   * Get SRN by ID
   * ADMIN or own retailer
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RETAILER)
  @ApiOperation({ summary: 'Get SRN by ID' })
  @ApiResponse({ status: 200, type: SRNResponseDto })
  @ApiResponse({ status: 404, description: 'SRN not found' })
  async findOne(@Param('id') id: string): Promise<SRNResponseDto> {
    return this.srnService.findOne(id);
  }
}