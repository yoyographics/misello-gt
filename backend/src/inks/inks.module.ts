import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { InksService } from './inks.service';
import { InksController } from './inks.controller';

@Module({
  imports: [JwtModule, AuthModule],
  controllers: [InksController],
  providers: [InksService],
})
export class InksModule {}
