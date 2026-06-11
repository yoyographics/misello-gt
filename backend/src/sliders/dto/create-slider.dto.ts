import { IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { SliderButtonType, SliderPosition } from '@prisma/client';

export class CreateSliderDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  imageUrl: string;

  @IsString()
  @IsOptional()
  gradient?: string;

  @IsBoolean()
  @IsOptional()
  useGradient?: boolean = true;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  gradientOpacity?: number = 0.85;

  @IsString()
  @IsOptional()
  animation?: string = 'fade-up';

  @IsString()
  @IsOptional()
  buttonText?: string = 'Crear mi sello';

  @IsEnum(SliderButtonType)
  @IsOptional()
  buttonType?: SliderButtonType = SliderButtonType.URL;

  @IsString()
  @IsOptional()
  buttonUrl?: string;

  @IsString()
  @IsOptional()
  buttonCategorySlug?: string;

  @IsString()
  @IsOptional()
  buttonProductId?: string;

  @IsEnum(SliderPosition)
  @IsOptional()
  position?: SliderPosition = SliderPosition.HOME;

  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
