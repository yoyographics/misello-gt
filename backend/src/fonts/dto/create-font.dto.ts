import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFontDto {
  @ApiPropertyOptional({ example: 'Arial', description: 'Nombre de la tipografia. Si no se envia, se usa el nombre del archivo.' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
