import { Module } from '@nestjs/common';
import { InksService } from './inks.service';
import { InksController } from './inks.controller';

@Module({
  controllers: [InksController],
  providers: [InksService],
})
export class InksModule {}
