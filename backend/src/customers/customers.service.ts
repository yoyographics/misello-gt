import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { search?: string; skip?: number; take?: number }) {
    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip || 0,
        take: query.take || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, skip: query.skip || 0, take: query.take || 20 };
  }

  async findById(id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async findOrdersByCustomer(id: string) {
    const customer = await this.prisma.user.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const orders = await this.prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            ink: { select: { color: true } },
          },
        },
        payments: true,
      },
    });

    return orders;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.user.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        billingAddress: dto.billingAddress,
        deliveryAddress: dto.deliveryAddress,
      },
    });
  }
}
