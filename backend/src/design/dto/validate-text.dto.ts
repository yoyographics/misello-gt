import { IsString, IsUUID, IsNumber, IsOptional, Min } from 'class-validator';

export class ValidateTextDto {
  @IsString()
  text: string;

  @IsUUID()
  fontId: string;

  @IsUUID()
  productId: string;

  @IsNumber()
  @IsOptional()
  @Min(6)
  fontSizePt?: number;
}
