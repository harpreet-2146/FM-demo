import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { BootstrapDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { Role } from '../../common/constants/roles.constant';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Check if system has been bootstrapped (first admin created)
   */
  async isBootstrapped(): Promise<boolean> {
    const userCount = await this.prisma.user.count();
    return userCount > 0;
  }

  /**
   * Bootstrap system with first admin
   * RULE: Only works when no users exist
   */
  async bootstrap(dto: BootstrapDto): Promise<AuthResponseDto> {
    // Check if already bootstrapped
    const isBootstrapped = await this.isBootstrapped();
    if (isBootstrapped) {
      throw new ForbiddenException(
        'System already bootstrapped. Contact existing administrator.',
      );
    }

    // Check if email already exists (shouldn't happen, but safety check)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create first admin - createdBy is null (bootstrap marker)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: Role.ADMIN,
        createdBy: null, // Bootstrap admin has no creator
      },
    });

    // Generate token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Login user
   * RULE: System must be bootstrapped first
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Check if system is bootstrapped
    const isBootstrapped = await this.isBootstrapped();
    if (!isBootstrapped) {
      throw new ForbiddenException(
        'System not initialized. Use /auth/bootstrap to create first administrator.',
      );
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Validate user from JWT payload
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: { id: string; email: string; role: string }): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}