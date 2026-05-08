import { PartialType } from '@nestjs/swagger';
import { CreateInkDto } from './create-ink.dto';

export class UpdateInkDto extends PartialType(CreateInkDto) {}
