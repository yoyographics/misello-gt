import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findLogs(query: InventoryQueryDto) {
    const where: any = {};
    if (query.productId) where.productId = query.productId;

    const [items, total] = await Promise.all([
      this.prisma.inventoryLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { sku: true, name: true } } },
      }),
      this.prisma.inventoryLog.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async adjustStock(dto: AdjustStockDto, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const newStock = product.stock + dto.delta;
    if (newStock < 0) {
      throw new Error('El stock no puede quedar negativo');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
      });

      await tx.inventoryLog.create({
        data: {
          productId: dto.productId,
          delta: dto.delta,
          reason: dto.reason || 'Ajuste manual de stock',
          createdBy: adminId,
        },
      });
    });

    return { message: 'Stock ajustado', productId: dto.productId, newStock };
  }

  async findLowStock(threshold: number = 10) {
    const products = await this.prisma.product.findMany({
      where: {
        stock: { lt: threshold },
        isActive: true,
      },
      orderBy: { stock: 'asc' },
    });

    const inks = await this.prisma.ink.findMany({
      where: {
        stock: { lt: threshold },
        isActive: true,
      },
      orderBy: { stock: 'asc' },
    });

    return { products, inks, threshold };
  }

  async getStockSummary() {
    const [totalProducts, totalInks, outOfStockProducts, outOfStockInks] =
      await Promise.all([
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.ink.count({ where: { isActive: true } }),
        this.prisma.product.count({ where: { stock: 0, isActive: true } }),
        this.prisma.ink.count({ where: { stock: 0, isActive: true } }),
      ]);

    return {
      totalProducts,
      totalInks,
      outOfStockProducts,
      outOfStockInks,
      lowStockThreshold: 10,
    };
  }
}
