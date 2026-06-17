import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ProductShape } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsEnum(ProductShape)
  productShape?: ProductShape;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : parseFloat(value)))
  @IsNumber()
  widthMm?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : parseFloat(value)))
  @IsNumber()
  heightMm?: number;

  @IsOptional()
  editableAreas?: any;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true' || value === '1';
    return true;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? 0 : parseInt(value, 10)))
  @IsNumber()
  sortOrder?: number;
}
