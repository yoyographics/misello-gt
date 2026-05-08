import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInkDto {
  @ApiProperty({ example: 'T-NEGRO' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Negro' })
  @IsString()
  color: string;

  @ApiProperty({ example: '#000000' })
  @IsString()
  hexCode: string;

  @ApiProperty({ example: 25.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
