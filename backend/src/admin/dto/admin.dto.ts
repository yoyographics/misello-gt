import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsDateString,
  IsJSON,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType, AdminRole } from '@prisma/client';

// ── Discounts ──
export class CreateDiscountDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsNumber()
  @Min(1)
  minQuantity: number;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}

export class UpdateDiscountDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ── Settings ──
export class UpdateSettingDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

// ── Users ──
export class CreateAdminUserDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  email: string;

  @IsString()
  @MaxLength(100)
  password: string;

  @IsEnum(AdminRole)
  role: AdminRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAdminUserDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  password?: string;

  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ── Role Permissions ──
export class UpdateRolePermissionsDto {
  @IsEnum(AdminRole)
  role: AdminRole;

  permissions: Record<string, boolean>;
}
