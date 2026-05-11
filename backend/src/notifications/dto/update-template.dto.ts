import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { EmailStage } from '@prisma/client';

export class UpdateTemplateDto {
  @IsEnum(EmailStage)
  stage: EmailStage;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(50000)
  htmlBody: string;
}

export class SendEmailDto {
  @IsEnum(EmailStage)
  stage: EmailStage;

  @IsString()
  to: string;

  @IsOptional()
  variables?: Record<string, string>;
}
