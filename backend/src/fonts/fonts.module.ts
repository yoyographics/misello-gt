import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FontsService } from './fonts.service';
import { FontsController } from './fonts.controller';

@Module({
  imports: [AuthModule],
  controllers: [FontsController],
  providers: [FontsService],
})
export class FontsModule {}
