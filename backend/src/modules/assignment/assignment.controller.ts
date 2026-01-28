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
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentResponseDto,
} from './dto/assignment.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Retailer-Manufacturer Assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  /**
   * Create a new assignment
   * ADMIN ONLY
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create retailer-manufacturer assignment (Admin only)' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid retailer or manufacturer' })
  @ApiResponse({ status: 409, description: 'Assignment already exists' })
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser('id') adminId: string,
  ): Promise<AssignmentResponseDto> {
    return this.assignmentService.create(dto, adminId);
  }

  /**
   * Get all assignments
   * ADMIN ONLY
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all assignments (Admin only)' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [AssignmentResponseDto] })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<AssignmentResponseDto[]> {
    return this.assignmentService.findAll(activeOnly !== 'false');
  }

  /**
   * Get my assigned manufacturers
   * RETAILER ONLY
   */
  @Get('my-manufacturers')
  @Roles(Role.RETAILER)
  @ApiOperation({ summary: 'Get my assigned manufacturers (Retailer only)' })
  @ApiResponse({ status: 200 })
  async getMyManufacturers(
    @CurrentUser('id') retailerId: string,
  ): Promise<{ id: string; name: string; email: string }[]> {
    return this.assignmentService.getAssignedManufacturers(retailerId);
  }

  /**
   * Get my assigned retailers
   * MANUFACTURER ONLY
   */
  @Get('my-retailers')
  @Roles(Role.MANUFACTURER)
  @ApiOperation({ summary: 'Get my assigned retailers (Manufacturer only)' })
  @ApiResponse({ status: 200, type: [AssignmentResponseDto] })
  async getMyRetailers(
    @CurrentUser('id') manufacturerId: string,
  ): Promise<AssignmentResponseDto[]> {
    return this.assignmentService.findByManufacturer(manufacturerId);
  }

  /**
   * Get assignments by retailer
   * ADMIN ONLY
   */
  @Get('retailer/:retailerId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get assignments by retailer (Admin only)' })
  @ApiResponse({ status: 200, type: [AssignmentResponseDto] })
  async findByRetailer(
    @Param('retailerId') retailerId: string,
  ): Promise<AssignmentResponseDto[]> {
    return this.assignmentService.findByRetailer(retailerId);
  }

  /**
   * Get assignments by manufacturer
   * ADMIN ONLY
   */
  @Get('manufacturer/:manufacturerId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get assignments by manufacturer (Admin only)' })
  @ApiResponse({ status: 200, type: [AssignmentResponseDto] })
  async findByManufacturer(
    @Param('manufacturerId') manufacturerId: string,
  ): Promise<AssignmentResponseDto[]> {
    return this.assignmentService.findByManufacturer(manufacturerId);
  }

  /**
   * Update assignment
   * ADMIN ONLY
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update assignment (Admin only)' })
  @ApiResponse({ status: 200, type: AssignmentResponseDto })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    return this.assignmentService.update(id, dto);
  }

  /**
   * Deactivate assignment
   * ADMIN ONLY
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate assignment (Admin only)' })
  @ApiResponse({ status: 204, description: 'Assignment deactivated' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async deactivate(@Param('id') id: string): Promise<void> {
    return this.assignmentService.deactivate(id);
  }
}