import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BootstrapDto {
  @ApiProperty({ example: 'admin@company.com', description: 'Admin email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({ example: 'System Administrator', description: 'Admin full name' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@company.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class SystemStatusDto {
  @ApiProperty({ description: 'Whether system has been bootstrapped with first admin' })
  bootstrapped: boolean;
}