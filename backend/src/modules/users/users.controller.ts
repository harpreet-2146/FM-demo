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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserResponseDto } from './dto/user.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/constants/roles.constant';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create new user
   * ADMIN ONLY - No public registration
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') adminId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, adminId);
  }

  /**
   * Get all users
   * ADMIN ONLY
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'role', enum: Role, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
  ): Promise<UserResponseDto[]> {
    const filters = {
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };
    return this.usersService.findAll(filters);
  }

  /**
   * Get manufacturers list
   * ADMIN ONLY
   */
  @Get('manufacturers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all manufacturers (Admin only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async getManufacturers(): Promise<UserResponseDto[]> {
    return this.usersService.findByRole(Role.MANUFACTURER);
  }

  /**
   * Get retailers list
   * ADMIN ONLY
   */
  @Get('retailers')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all retailers (Admin only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async getRetailers(): Promise<UserResponseDto[]> {
    return this.usersService.findByRole(Role.RETAILER);
  }

  /**
   * Get user by ID
   * ADMIN ONLY
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  /**
   * Update user
   * ADMIN ONLY
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  /**
   * Change user password
   * ADMIN ONLY
   */
  @Patch(':id/password')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change user password (Admin only)' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(id, dto);
  }

  /**
   * Deactivate user
   * ADMIN ONLY
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User deactivated' })
  @ApiResponse({ status: 403, description: 'Cannot deactivate bootstrap admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(@Param('id') id: string): Promise<void> {
    return this.usersService.deactivate(id);
  }
}