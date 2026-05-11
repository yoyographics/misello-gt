import { Module } from '@nestjs/common';
import { AuthJwtModule } from '../auth/auth-jwt.module';
import { AuthModule } from '../auth/auth.module';
import { InksService } from './inks.service';
import { InksController } from './inks.controller';

@Module({
  imports: [AuthJwtModule, AuthModule],
  controllers: [InksController],
  providers: [InksService],
})
export class InksModule {}
