import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductShape } from '@prisma/client';

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

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ enum: ProductShape, example: ProductShape.RECTANGULAR })
  @IsString()
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

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image-hover.png' })
  @IsString()
  @IsOptional()
  imageUrlHover?: string;

  @ApiPropertyOptional({ example: 'Nuevo' })
  @IsString()
  @IsOptional()
  cardLabel?: string;

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

  // Configuración de área reservada para sellos fechadores
  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  hasReservedArea?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reservedWidthMm?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reservedHeightMm?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  reservedPositionX?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  reservedPositionY?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  reservedStroke?: boolean;

  @ApiPropertyOptional({ example: 1.0, default: 1.0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reservedStrokeWidth?: number;
}
