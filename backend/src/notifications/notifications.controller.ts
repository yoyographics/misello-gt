import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { UpdateTemplateDto, SendEmailDto } from './dto/update-template.dto';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { EmailStage } from '@prisma/client';

/**
 * Controlador del modulo de notificaciones.
 * Solo accesible por administradores.
 */
@ApiTags('Notificaciones — Email Templates')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Listar todos los templates */
  @Get('templates')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findAllTemplates() {
    return this.notificationsService.findAllTemplates();
  }

  /** Ver un template por etapa */
  @Get('templates/:stage')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  findTemplate(@Param('stage') stage: EmailStage) {
    return this.notificationsService.findTemplateByStage(stage);
  }

  /** Crear o actualizar un template */
  @Patch('templates')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  upsertTemplate(@Body() dto: UpdateTemplateDto) {
    return this.notificationsService.upsertTemplate(dto.stage, dto.subject, dto.htmlBody);
  }

  /** Enviar email manualmente desde el panel */
  @Post('send')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail(dto.stage, dto.to, dto.variables);
  }

  /** Crear templates por defecto */
  @Post('seed')
  @UseGuards(JwtAdminGuard)
  @ApiBearerAuth()
  seedTemplates() {
    return this.notificationsService.seedDefaultTemplates();
  }
}
