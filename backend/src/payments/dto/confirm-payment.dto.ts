import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/comprobante.png' })
  @IsString()
  @IsOptional()
  receiptUrl?: string;
}
