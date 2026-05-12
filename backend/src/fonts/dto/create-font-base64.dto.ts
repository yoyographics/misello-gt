import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFontBase64Dto {
  @ApiProperty({ example: 'base64encodedstring...', description: 'Contenido del archivo .ttf o .otf en base64' })
  @IsString()
  fileBase64: string;

  @ApiProperty({ example: 'Arial.ttf', description: 'Nombre original del archivo' })
  @IsString()
  originalName: string;

  @ApiPropertyOptional({ example: 'Arial', description: 'Nombre de la tipografia. Si no se envia, se usa el nombre del archivo.' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
