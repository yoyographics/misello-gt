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
  @IsNumber()
  widthMm?: number;

  @IsOptional()
  @IsNumber()
  heightMm?: number;

  @IsOptional()
  editableAreas?: any;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
