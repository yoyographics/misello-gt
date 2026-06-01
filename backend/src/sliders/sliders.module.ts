import { Module } from '@nestjs/common';
import { SlidersService } from './sliders.service';
import { SlidersController } from './sliders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthJwtModule } from '../auth/auth-jwt.module';

@Module({
  imports: [PrismaModule, AuthJwtModule],
  controllers: [SlidersController],
  providers: [SlidersService],
})
export class SlidersModule {}
