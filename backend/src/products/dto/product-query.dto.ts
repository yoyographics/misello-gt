import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategory, ProductShape } from '@prisma/client';

export class ProductQueryDto {
  @ApiPropertyOptional({ enum: ProductCategory })
  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @ApiPropertyOptional({ enum: ProductShape })
  @IsEnum(ProductShape)
  @IsOptional()
  shape?: ProductShape;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'sello' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  take?: number = 20;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
