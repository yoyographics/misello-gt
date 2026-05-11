import { Module } from '@nestjs/common';
import { AuthJwtModule } from '../auth/auth-jwt.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

/**
 * Modulo 8 — Control Panel (private API).
 * Admin completo: discounts, waitlist, settings, user management, roles configurables.
 */
@Module({
  imports: [AuthJwtModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
