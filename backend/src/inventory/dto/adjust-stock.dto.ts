import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 10, description: 'Positivo para entrada, negativo para salida' })
  @IsNumber()
  delta: number;

  @ApiPropertyOptional({ example: 'Compra a proveedor' })
  @IsString()
  @IsOptional()
  reason?: string;
}
