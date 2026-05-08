import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTrackingDto {
  @ApiProperty({ example: 'CA123456789GT' })
  @IsString()
  courierTracking: string;
}
