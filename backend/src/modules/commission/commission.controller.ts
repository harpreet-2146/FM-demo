import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommissionService } from './commission.service';
import {
  CommissionResponseDto,
  CommissionSummaryDto,
  RetailerCommissionSummaryDto,
} from './dto/commission.dto';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';
import { CommissionStatus } from '@prisma/client';

/**
 * Commission Controller
 * ADMIN ONLY - Manufacturer CANNOT access any commission endpoints
 */
@ApiTags('Commissions')
@ApiBearerAuth()
@Controller('commissions')
@Roles(Role.ADMIN) // All endpoints are Admin only
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  /**
   * Get commission summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get commission summary (Admin only)' })
  @ApiResponse({ status: 200, type: CommissionSummaryDto })
  async getSummary(): Promise<CommissionSummaryDto> {
    return this.commissionService.getSummary();
  }

  /**
   * Get commission summary by retailer
   */
  @Get('by-retailer/summary')
  @ApiOperation({ summary: 'Get commission summary by retailer (Admin only)' })
  @ApiResponse({ status: 200, type: [RetailerCommissionSummaryDto] })
  async getSummaryByRetailer(): Promise<RetailerCommissionSummaryDto[]> {
    return this.commissionService.getSummaryByRetailer();
  }

  /**
   * Get all commissions
   */
  @Get()
  @ApiOperation({ summary: 'Get all commissions (Admin only)' })
  @ApiQuery({ name: 'status', enum: CommissionStatus, required: false })
  @ApiResponse({ status: 200, type: [CommissionResponseDto] })
  async findAll(
    @Query('status') status?: CommissionStatus,
  ): Promise<CommissionResponseDto[]> {
    return this.commissionService.findAll(status);
  }

  /**
   * Get commissions for a retailer
   */
  @Get('retailer/:retailerId')
  @ApiOperation({ summary: 'Get commissions for a retailer (Admin only)' })
  @ApiResponse({ status: 200, type: [CommissionResponseDto] })
  async findByRetailer(
    @Param('retailerId') retailerId: string,
  ): Promise<CommissionResponseDto[]> {
    return this.commissionService.findByRetailer(retailerId);
  }

  /**
   * Mark commission as paid
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark commission as paid (Admin only)' })
  @ApiResponse({ status: 200, type: CommissionResponseDto })
  async markPaid(@Param('id') id: string): Promise<CommissionResponseDto> {
    return this.commissionService.markPaid(id);
  }

  /**
   * Mark all pending commissions as paid for a retailer
   */
  @Post('retailer/:retailerId/pay-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay all pending commissions for retailer (Admin only)' })
  @ApiResponse({ status: 200, description: 'Number of commissions paid' })
  async markAllPaidForRetailer(
    @Param('retailerId') retailerId: string,
  ): Promise<{ count: number }> {
    const count = await this.commissionService.markAllPaidForRetailer(retailerId);
    return { count };
  }
}