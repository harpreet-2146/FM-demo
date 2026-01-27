import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { BootstrapDto, LoginDto, AuthResponseDto, SystemStatusDto } from './dto/auth.dto';
import { Public } from '../../common/decorators';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Check system status (bootstrapped or not)
   * PUBLIC - no auth required
   */
  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Check if system is bootstrapped' })
  @ApiResponse({ status: 200, type: SystemStatusDto })
  async getStatus(): Promise<SystemStatusDto> {
    const bootstrapped = await this.authService.isBootstrapped();
    return { bootstrapped };
  }

  /**
   * Bootstrap system with first admin
   * PUBLIC - but only works when no users exist
   */
  @Post('bootstrap')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create first admin (only works on empty system)' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'System already bootstrapped' })
  async bootstrap(@Body() dto: BootstrapDto): Promise<AuthResponseDto> {
    return this.authService.bootstrap(dto);
  }

  /**
   * Login
   * PUBLIC - system must be bootstrapped first
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'System not bootstrapped' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}