import { Module } from '@nestjs/common';
import { AuthJwtModule } from '../auth/auth-jwt.module';
import { AuthModule } from '../auth/auth.module';
import { FontsService } from './fonts.service';
import { FontsController } from './fonts.controller';

@Module({
  imports: [AuthJwtModule, AuthModule],
  controllers: [FontsController],
  providers: [FontsService],
})
export class FontsModule {}
