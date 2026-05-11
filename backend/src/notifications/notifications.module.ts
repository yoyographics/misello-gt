import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Modulo 7 — Notificaciones.
 * Emails transaccionales en 3 etapas con templates editables.
 * Envio automatico (etapa 1) y manual desde panel (etapas 2 y 3).
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
