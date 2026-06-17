import { IsString, IsOptional, IsArray, IsBoolean, IsUUID, ArrayMinSize, MaxLength } from 'class-validator';

export class DesignLineDto {
  @IsString()
  @MaxLength(100)
  text: string;

  @IsOptional()
  @IsString()
  fontSize?: string; // e.g. "12pt", "14pt"

  @IsOptional()
  @IsBoolean()
  isBold?: boolean;

  @IsOptional()
  @IsBoolean()
  isItalic?: boolean;

  @IsOptional()
  @IsString()
  alignment?: 'left' | 'center' | 'right';
}

export class DesignRequestDto {
  @IsUUID()
  productId: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @ArrayMinSize(1)
  lines: DesignLineDto[];

  @IsUUID()
  fontId: string;

  @IsUUID()
  @IsOptional()
  inkId?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  hasLogoGradient?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  specialRequests?: string;

  @IsBoolean()
  @IsOptional()
  skipClaude?: boolean; // para testing: usar renderer directo sin Claude

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsOptional()
  templateData?: Record<string, string>;
}
