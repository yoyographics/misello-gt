import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import { EmailStage } from '@prisma/client';

/**
 * Servicio de notificaciones por email.
 * Maneja templates editables y envio transaccional en 3 etapas.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /**
   * Obtener todos los templates de email.
   */
  async findAllTemplates() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { stage: 'asc' },
    });
  }

  /**
   * Obtener un template por etapa.
   */
  async findTemplateByStage(stage: EmailStage) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { stage },
    });
    if (!template) {
      throw new NotFoundException(`Template para etapa ${stage} no encontrado`);
    }
    return template;
  }

  /**
   * Crear o actualizar un template.
   */
  async upsertTemplate(stage: EmailStage, subject: string, htmlBody: string) {
    const template = await this.prisma.emailTemplate.upsert({
      where: { stage },
      update: { subject, htmlBody, updatedAt: new Date() },
      create: { stage, subject, htmlBody },
    });
    this.logger.log(`Template ${stage} actualizado`);
    return template;
  }

  /**
   * Enviar email usando un template y variables.
   * Las variables se reemplazan en el formato {{variableName}}.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async sendEmail(stage: EmailStage, to: string, variables?: Record<string, string>) {
    const template = await this.findTemplateByStage(stage);

    let html = template.htmlBody;
    let subject = template.subject;

    // Reemplazar variables (escapadas para evitar XSS en email)
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        const safeValue = this.escapeHtml(value);
        html = html.replace(regex, safeValue);
        subject = subject.replace(regex, safeValue);
      }
    }

    try {
      await this.mailer.sendMail({
        to,
        subject,
        html,
      });
      this.logger.log(`Email ${stage} enviado a ${to}`);
      return { sent: true, stage, to };
    } catch (error) {
      this.logger.error(`Error enviando email ${stage} a ${to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar email automatico al recibir pago (etapa 1).
   * Este metodo es llamado por el modulo de pagos/ordenes.
   */
  async sendPaymentReceivedEmail(to: string, orderData: { orderNumber: string; customerName: string; totalAmount: string }) {
    return this.sendEmail(EmailStage.PAYMENT_RECEIVED, to, {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      totalAmount: orderData.totalAmount,
    });
  }

  /**
   * Enviar email de orden confirmada (etapa 2) — manual desde panel.
   */
  async sendOrderConfirmedEmail(to: string, orderData: { orderNumber: string; customerName: string }) {
    return this.sendEmail(EmailStage.ORDER_CONFIRMED, to, {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
    });
  }

  /**
   * Enviar email de orden terminada (etapa 3) — manual desde panel.
   * Incluye numero de guia del courier.
   */
  async sendOrderFinishedEmail(
    to: string,
    orderData: { orderNumber: string; customerName: string; trackingNumber?: string },
  ) {
    return this.sendEmail(EmailStage.ORDER_FINISHED, to, {
      orderNumber: orderData.orderNumber,
      customerName: orderData.customerName,
      trackingNumber: orderData.trackingNumber || 'Pendiente',
    });
  }

  /**
   * Crear templates por defecto si no existen.
   */
  async seedDefaultTemplates() {
    const defaults = [
      {
        stage: EmailStage.PAYMENT_RECEIVED,
        subject: 'Pago recibido — Orden #{{orderNumber}}',
        htmlBody: `<h2>¡Gracias por tu compra, {{customerName}}!</h2>
<p>Hemos recibido tu pago de <strong>Q{{totalAmount}}</strong> por la orden <strong>#{{orderNumber}}</strong>.</p>
<p>Tu sello esta en proceso de diseno y produccion. Te notificaremos cuando este listo.</p>
<p><em>Powered by YOYO GRAPHICS — misello.gt</em></p>`,
      },
      {
        stage: EmailStage.ORDER_CONFIRMED,
        subject: 'Orden confirmada — #{{orderNumber}}',
        htmlBody: `<h2>Hola {{customerName}},</h2>
<p>Tu orden <strong>#{{orderNumber}}</strong> ha sido confirmada y esta en produccion.</p>
<p>El tiempo estimado de entrega es de 3 a 4 dias habiles.</p>
<p><em>Powered by YOYO GRAPHICS — misello.gt</em></p>`,
      },
      {
        stage: EmailStage.ORDER_FINISHED,
        subject: 'Tu sello esta listo — Orden #{{orderNumber}}',
        htmlBody: `<h2>¡Hola {{customerName}}!</h2>
<p>Tu orden <strong>#{{orderNumber}}</strong> ha finalizado y esta en camino.</p>
<p><strong>Numero de guia:</strong> {{trackingNumber}}</p>
<p>Gracias por confiar en YOYO GRAPHICS.</p>
<p><em>Powered by YOYO GRAPHICS — misello.gt</em></p>`,
      },
    ];

    for (const tmpl of defaults) {
      await this.prisma.emailTemplate.upsert({
        where: { stage: tmpl.stage },
        update: {},
        create: tmpl,
      });
    }
    this.logger.log('Templates de email por defecto creados/verificados');
  }
}
