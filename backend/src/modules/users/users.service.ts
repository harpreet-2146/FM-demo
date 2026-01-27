import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UserResponseDto } from './dto/user.dto';
import { Role } from '../../common/constants/roles.constant';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user
   * ADMIN ONLY - No public registration
   */
  async create(dto: CreateUserDto, adminId: string): Promise<UserResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.role,
        createdBy: adminId,
      },
    });

    return this.mapToResponse(user);
  }

  /**
   * Get all users
   * ADMIN ONLY
   */
  async findAll(filters?: { role?: Role; isActive?: boolean }): Promise<UserResponseDto[]> {
    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return users.map(this.mapToResponse);
  }

  /**
   * Get user by ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponse(user);
  }

  /**
   * Get users by role
   */
  async findByRole(role: Role): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { role, isActive: true },
      orderBy: { name: 'asc' },
    });

    return users.map(this.mapToResponse);
  }

  /**
   * Update user
   * ADMIN ONLY - Cannot change role or email
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot deactivate bootstrap admin
    if (dto.isActive === false && user.createdBy === null) {
      throw new ForbiddenException('Cannot deactivate bootstrap administrator');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
    });

    return this.mapToResponse(updatedUser);
  }

  /**
   * Change user password
   * ADMIN ONLY
   */
  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  /**
   * Deactivate user (soft delete)
   * ADMIN ONLY
   */
  async deactivate(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cannot deactivate bootstrap admin
    if (user.createdBy === null) {
      throw new ForbiddenException('Cannot deactivate bootstrap administrator');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Map user entity to response DTO
   */
  private mapToResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}