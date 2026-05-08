import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InksService } from './inks.service';
import { InksController } from './inks.controller';

@Module({
  imports: [AuthModule],
  controllers: [InksController],
  providers: [InksService],
})
export class InksModule {}
