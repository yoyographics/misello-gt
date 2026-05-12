import {
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Items del pedido' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({
    example: { street: 'Zona 1, Ciudad de Guatemala', phone: '5555-5555' },
    description: 'Dirección de envío en formato JSON',
  })
  @IsObject()
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @ApiPropertyOptional({ example: '1234567-8' })
  @IsString()
  @IsOptional()
  nitOrCui?: string;

  @ApiPropertyOptional({ example: 'YOYO GRAPHICS, S.A.' })
  @IsString()
  @IsOptional()
  invoiceName?: string;

  @ApiPropertyOptional({ example: false, description: 'Si es para entidad gubernamental' })
  @IsBoolean()
  @IsOptional()
  isGovernment?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Si es réplica de abogado' })
  @IsBoolean()
  @IsOptional()
  isLawyerReplica?: boolean;

  @ApiPropertyOptional({ example: 'TRANSFER', enum: ['CARD', 'TRANSFER'] })
  @IsString()
  @IsOptional()
  paymentMethod?: 'CARD' | 'TRANSFER';
}
