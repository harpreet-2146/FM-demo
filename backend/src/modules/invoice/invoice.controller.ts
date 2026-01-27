import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { GenerateInvoiceDto, InvoiceResponseDto } from './dto/invoice.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Generate invoice from GRN
   * ADMIN ONLY
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate invoice from GRN (Admin only)' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'GRN not confirmed or invoice exists' })
  async generate(
    @Body() dto: GenerateInvoiceDto,
    @CurrentUser('id') adminId: string,
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.generate(dto, adminId);
  }

  /**
   * Get my invoices
   * RETAILER ONLY
   * NOTE: Manufacturer CANNOT access invoices
   */
  @Get('my')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my invoices (Retailer only)' })
  @ApiResponse({ status: 200, type: [InvoiceResponseDto] })
  async getMyInvoices(
    @CurrentUser('id') retailerId: string,
  ): Promise<InvoiceResponseDto[]> {
    return this.invoiceService.findByRetailer(retailerId);
  }

  /**
   * Get all invoices
   * ADMIN ONLY
   * NOTE: Manufacturer CANNOT access
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all invoices (Admin only)' })
  @ApiResponse({ status: 200, type: [InvoiceResponseDto] })
  async findAll(): Promise<InvoiceResponseDto[]> {
    return this.invoiceService.findAll();
  }

  /**
   * Get invoice by ID
   * ADMIN or RETAILER (own invoices only)
   * NOTE: Manufacturer CANNOT access
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RETAILER)
  @ApiOperation({ summary: 'Get invoice by ID (Admin or Retailer)' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id') id: string): Promise<InvoiceResponseDto> {
    return this.invoiceService.findOne(id);
  }
}