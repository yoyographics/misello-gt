import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { FontsService } from './fonts.service';
import { FontsController } from './fonts.controller';

@Module({
  imports: [JwtModule, AuthModule],
  controllers: [FontsController],
  providers: [FontsService],
})
export class FontsModule {}
