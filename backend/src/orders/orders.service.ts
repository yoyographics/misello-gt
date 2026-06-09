import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { OrderQueryDto } from './dto/order-query.dto';

const ALLOWED_ORDER_SORT_FIELDS = ['createdAt', 'status', 'totalAmount', 'orderNumber'] as const;
type OrderSortField = typeof ALLOWED_ORDER_SORT_FIELDS[number];

function buildOrderOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  if (!sortBy || !ALLOWED_ORDER_SORT_FIELDS.includes(sortBy as OrderSortField)) {
    return { createdAt: sortOrder };
  }
  return { [sortBy]: sortOrder };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private generateOrderNumber(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const rnd = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `ORD-${y}${m}${d}-${rnd}`;
  }

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un item');
    }

    // Validar productos, tintas y stock fuera de la transacción para obtener info
    const itemsData: {
      productId: string;
      inkId?: string;
      quantity: number;
      unitPrice: number;
      designJson?: any;
      notes?: string;
    }[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Producto no encontrado o inactivo: ${item.productId}`,
        );
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`,
        );
      }

      let unitPrice = product.basePrice;

      if (item.inkId) {
        const ink = await this.prisma.ink.findUnique({
          where: { id: item.inkId },
        });
        if (!ink || !ink.isActive) {
          throw new BadRequestException(
            `Tinta no encontrada o inactiva: ${item.inkId}`,
          );
        }
        if (ink.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente de tinta ${ink.color}. Disponible: ${ink.stock}, Solicitado: ${item.quantity}`,
          );
        }
        unitPrice += ink.price;
      }

      itemsData.push({
        productId: item.productId,
        inkId: item.inkId,
        quantity: item.quantity,
        unitPrice,
        designJson: item.designJson,
        notes: item.notes,
      });
    }

    const totalAmount = itemsData.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const requiresAdminApproval =
      dto.isGovernment || dto.isLawyerReplica || false;

    // Actualizar datos del cliente si se proporcionan
    const userUpdateData: Prisma.UserUpdateInput = {};
    if (dto.customerName) userUpdateData.name = dto.customerName;
    if (dto.customerPhone) userUpdateData.phone = dto.customerPhone;
    if (dto.shippingAddress) {
      userUpdateData.deliveryAddress = dto.shippingAddress as Prisma.JsonObject;
    }
    if (dto.nitOrCui || dto.invoiceName) {
      const existingBilling = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { billingAddress: true },
      });
      const currentBilling = (existingBilling?.billingAddress as Record<string, any>) || {};
      userUpdateData.billingAddress = {
        ...currentBilling,
        ...(dto.nitOrCui ? { nitOrCui: dto.nitOrCui } : {}),
        ...(dto.invoiceName ? { invoiceName: dto.invoiceName } : {}),
        ...(dto.shippingAddress ? { ...dto.shippingAddress } : {}),
      } as Prisma.JsonObject;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Transacción atómica
    const order = await this.prisma.$transaction(async (tx) => {
      // Crear orden
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          status: requiresAdminApproval
            ? OrderStatus.DRAFT
            : OrderStatus.PENDING_PAYMENT,
          totalAmount,
          shippingAddress: dto.shippingAddress
            ? (dto.shippingAddress as Prisma.JsonObject)
            : undefined,
          nitOrCui: dto.nitOrCui,
          invoiceName: dto.invoiceName,
          isGovernment: dto.isGovernment || false,
          isLawyerReplica: dto.isLawyerReplica || false,
          requiresAdminApproval,
        },
      });

      // Crear items
      for (const item of itemsData) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            inkId: item.inkId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            designJson: item.designJson
              ? (item.designJson as Prisma.JsonObject)
              : undefined,
            notes: item.notes,
          },
        });

        // Descontar stock de producto
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Registrar en inventario
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            delta: -item.quantity,
            reason: `Pedido ${newOrder.orderNumber}`,
            createdBy: userId,
          },
        });

        // Descontar stock de tinta si aplica
        if (item.inkId) {
          await tx.ink.update({
            where: { id: item.inkId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return newOrder;
    });

    return this.findOneById(order.id);
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true, ink: true },
        },
        payments: true,
      },
    });
  }

  async findMyOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: { product: true, ink: true },
        },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async findAllAdmin(query: OrderQueryDto) {
    const where: Prisma.OrderWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.email) {
      where.user = { email: { contains: query.email, mode: 'insensitive' } };
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: buildOrderOrderBy(query.sortBy, query.sortOrder),
        include: {
          user: { select: { id: true, email: true, name: true, phone: true } },
          items: { include: { product: true, ink: true } },
          payments: true,
          approvedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async findOneAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        items: { include: { product: true, ink: true } },
        payments: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminId: string,
  ) {
    const order = await this.findOneAdmin(orderId);

    // Validar transiciones de estado permitidas
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PENDING_PAYMENT]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PAYMENT_RECEIVED]: [OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED]: [OrderStatus.IN_PRODUCTION],
      [OrderStatus.IN_PRODUCTION]: [OrderStatus.FINISHED],
      [OrderStatus.FINISHED]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [],
      [OrderStatus.CANCELLED]: [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAYMENT_RECEIVED,
        OrderStatus.CONFIRMED,
        OrderStatus.IN_PRODUCTION,
        OrderStatus.FINISHED,
        OrderStatus.SHIPPED,
      ],
    };

    if (!allowedTransitions[order.status].includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${order.status} a ${dto.status}`,
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
      include: {
        items: { include: { product: true, ink: true } },
        payments: true,
      },
    });

    // Incrementar salesCount de productos al confirmar/recibir pago/finalizar
    const countedStatuses: readonly OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.PAYMENT_RECEIVED,
      OrderStatus.FINISHED,
    ];
    if (
      countedStatuses.includes(dto.status) &&
      !countedStatuses.includes(order.status)
    ) {
      await this.prisma.product.updateMany({
        where: { id: { in: order.items.map((i) => i.productId) } },
        data: { salesCount: { increment: 1 } },
      });
    }

    return updatedOrder;
  }

  async updateTracking(orderId: string, dto: UpdateTrackingDto) {
    await this.findOneAdmin(orderId);
    return this.prisma.order.update({
      where: { id: orderId },
      data: { courierTracking: dto.courierTracking },
      include: {
        items: { include: { product: true, ink: true } },
      },
    });
  }

  async approve(orderId: string, adminId: string) {
    const order = await this.findOneAdmin(orderId);

    if (!order.requiresAdminApproval) {
      throw new BadRequestException('Este pedido no requiere aprobación');
    }
    if (order.adminApprovedAt) {
      throw new BadRequestException('Este pedido ya fue aprobado');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PENDING_PAYMENT,
        adminApprovedAt: new Date(),
        adminApprovedBy: adminId,
      },
      include: {
        items: { include: { product: true, ink: true } },
        payments: true,
      },
    });
  }

  async cancel(orderId: string, userId: string, isAdmin: boolean) {
    const where = isAdmin ? { id: orderId } : { id: orderId, userId };
    const order = await this.prisma.order.findFirst({
      where,
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('El pedido ya está cancelado');
    }
    if (order.status === OrderStatus.SHIPPED) {
      throw new BadRequestException('No se puede cancelar un pedido enviado');
    }

    // Devolver stock
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            delta: item.quantity,
            reason: `Cancelación pedido ${order.orderNumber}`,
            createdBy: userId,
          },
        });

        if (item.inkId) {
          await tx.ink.update({
            where: { id: item.inkId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    });

    return { message: 'Pedido cancelado exitosamente' };
  }

  private async findOneById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true, ink: true } },
        payments: true,
      },
    });
  }
}
