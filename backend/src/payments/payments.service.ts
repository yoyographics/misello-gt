import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se puede pagar una orden cancelada');
    }

    if (order.status === OrderStatus.SHIPPED) {
      throw new BadRequestException('La orden ya fue enviada');
    }

    // Validar monto (tolerancia de 0.01 por redondeo)
    if (Math.abs(order.totalAmount - dto.amount) > 0.01) {
      throw new BadRequestException(
        `El monto no coincide con el total de la orden. Esperado: ${order.totalAmount}, Recibido: ${dto.amount}`,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        method: dto.method,
        amount: dto.amount,
        status: PaymentStatus.PENDING,
        referenceCode: dto.referenceCode,
      },
    });

    // Actualizar orden con método de pago
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { paymentMethod: dto.method },
    });

    return payment;
  }

  async confirm(paymentId: string, dto: ConfirmPaymentDto, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Este pago ya fue procesado');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CONFIRMED,
        receiptUrl: dto.receiptUrl,
        confirmedAt: new Date(),
        confirmedBy: adminId,
      },
    });

    // Avanzar la orden a CONFIRMED
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    return updatedPayment;
  }

  async reject(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Este pago ya fue procesado');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        confirmedAt: new Date(),
        confirmedBy: adminId,
      },
    });

    return updatedPayment;
  }

  async findAllAdmin(query: PaymentQueryDto) {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, userId: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async findOneAdmin(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            user: { select: { email: true, name: true } },
            items: { include: { product: true, ink: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado');
    return payment;
  }

  /** Webhook para recepción de confirmación del proveedor de pagos */
  async handleWebhook(payload: any) {
    // Por ahora stub — se implementará cuando se integre Pagalo
    // El payload debe incluir: orderId, transactionId, status, amount
    return { received: true, message: 'Webhook procesado (stub)' };
  }
}
