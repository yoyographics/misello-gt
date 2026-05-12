import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.category) where.category = query.category;
    if (query.shape) where.shape = query.shape;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy as string]: query.sortOrder } as any,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async findAllAdmin(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};

    if (query.category) where.category = query.category;
    if (query.shape) where.shape = query.shape;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy as string]: query.sortOrder } as any,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async findOnePublic(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async findOneAdmin(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOneAdmin(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async uploadImage(id: string, file: Express.Multer.File, field: 'imageUrl' | 'imageUrlHover' = 'imageUrl') {
    await this.findOneAdmin(id);
    const imageUrl = `/uploads/product-photos/${file.filename}`;
    return this.prisma.product.update({
      where: { id },
      data: { [field]: imageUrl },
    });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}
