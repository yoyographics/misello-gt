import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '+502 5555 1234' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: { address: 'Zona 1', municipality: 'Guatemala', department: 'Guatemala', nitOrCui: '12345678', invoiceName: 'Juan Perez' } })
  @IsObject()
  @IsOptional()
  billingAddress?: Record<string, any>;

  @ApiPropertyOptional({ example: { address: 'Zona 10', municipality: 'Guatemala', department: 'Guatemala' } })
  @IsObject()
  @IsOptional()
  deliveryAddress?: Record<string, any>;
}
