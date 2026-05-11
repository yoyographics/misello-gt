import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Modulo 8 — Control Panel (private API).
 * Admin completo: discounts, waitlist, settings, user management, roles configurables.
 */
@Module({
  imports: [JwtModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
