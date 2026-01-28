import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Retailer ID' })
  @IsString()
  @IsNotEmpty()
  retailerId: string;

  @ApiProperty({ description: 'Manufacturer ID' })
  @IsString()
  @IsNotEmpty()
  manufacturerId: string;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailerName: string;

  @ApiProperty()
  retailerEmail: string;

  @ApiProperty()
  manufacturerId: string;

  @ApiProperty()
  manufacturerName: string;

  @ApiProperty()
  manufacturerEmail: string;

  @ApiProperty()
  assignedAt: Date;

  @ApiProperty()
  assignedBy: string;

  @ApiProperty()
  assignedByName: string;

  @ApiProperty()
  isActive: boolean;
}

export class RetailerAssignedManufacturersDto {
  @ApiProperty()
  retailerId: string;

  @ApiProperty()
  retailers: {
    id: string;
    name: string;
    email: string;
  }[];
}