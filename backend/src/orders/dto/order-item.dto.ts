import { IsString, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'uuid-de-la-tinta' })
  @IsString()
  @IsOptional()
  inkId?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'JSON del diseño del sello' })
  @IsObject()
  @IsOptional()
  designJson?: Record<string, any>;

  @ApiPropertyOptional({ example: 'Notas especiales para producción' })
  @IsString()
  @IsOptional()
  notes?: string;
}
