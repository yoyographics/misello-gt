import { PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { CreateFontDto } from './create-font.dto';

export class UpdateFontDto extends PartialType(CreateFontDto) {
  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(72)
  minFontSizePt?: number;
}
