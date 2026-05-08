import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, ProductShape } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'SELLO-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Sello automático Trodat 4913' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Sello automático de alta calidad...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ProductCategory, example: ProductCategory.MONTURA_AUTOMATICA })
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiPropertyOptional({ enum: ProductShape, example: ProductShape.RECTANGULAR })
  @IsEnum(ProductShape)
  @IsOptional()
  shape?: ProductShape;

  @ApiPropertyOptional({ example: 58 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  widthMm?: number;

  @ApiPropertyOptional({ example: 22 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  heightMm?: number;

  @ApiPropertyOptional({ example: 220 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  widthPx?: number;

  @ApiPropertyOptional({ example: 84 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  heightPx?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 125.0 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;
}
