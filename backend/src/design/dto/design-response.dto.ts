import { IsString, IsObject, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class DesignValidationResultDto {
  @IsBoolean()
  passed: boolean;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  @IsOptional()
  minCharSizePx?: number;

  @IsNumber()
  @IsOptional()
  minLineThicknessPx?: number;
}

export class DesignResponseDto {
  @IsString()
  designId: string;

  @IsObject()
  designJson: Record<string, any>;

  @IsString()
  previewPngUrl: string;

  @IsString()
  productionSvgUrl: string;

  @IsObject()
  validation: DesignValidationResultDto;

  @IsBoolean()
  @IsOptional()
  logoConvertedToBw?: boolean;

  @IsBoolean()
  @IsOptional()
  fontAutoAdjusted?: boolean;
}
