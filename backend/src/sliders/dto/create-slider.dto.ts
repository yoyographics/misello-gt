import { IsString, IsOptional, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { SliderButtonType } from '@prisma/client';

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

  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
