import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly CLOUDINARY_FOLDER = 'MI SELLO';

  private getCategoryFolder(category: string): string {
    const map: Record<string, string> = {
      MONTURA_AUTOMATICA: 'sellos-automaticos',
      FECHADOR: 'fechadores',
      PORTATIL: 'sellos-portatiles',
      MADERA: 'sellos-madera',
      TINTA: 'tintas',
      EMBOSSER: 'embosadoras',
      EMBOSSING: 'embosadoras',
      EMBOSADORA: 'embosadoras',
    };
    return map[category] || 'otros';
  }

  private toWebpUrl(cloudinaryUrl: string): string {
    // Convierte la URL de Cloudinary a WebP con calidad auto
    // https://res.cloudinary.com/.../image/upload/v123/... → /image/upload/f_webp,q_auto/v123/...
    return cloudinaryUrl.replace('/upload/', '/upload/f_webp,q_auto/');
  }

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

  async uploadImage(
    id: string,
    file: Express.Multer.File,
    cloudinaryService: CloudinaryService,
    field: 'imageUrl' | 'imageUrlHover' = 'imageUrl',
  ) {
    if (!file || !file.buffer) {
      throw new Error('No se recibio el archivo o no tiene buffer. Verifica que el formulario envie un campo llamado "image".');
    }

    const product = await this.findOneAdmin(id);
    const sku = (product.sku || id).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const suffix = field === 'imageUrlHover' ? '-hover' : '';
    const publicId = `${sku}${suffix}`;
    const subFolder = this.getCategoryFolder(product.category || '');
    const folder = `${this.CLOUDINARY_FOLDER}/${subFolder}`;

    const secureUrl = await cloudinaryService.uploadImage(
      file.buffer,
      folder,
      publicId,
    );

    const webpUrl = this.toWebpUrl(secureUrl);

    return this.prisma.product.update({
      where: { id },
      data: { [field]: webpUrl },
    });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  /** Corrige categorías basadas en SKU según el catálogo oficial */
  async fixCategories() {
    const products = await this.prisma.product.findMany();
    const updates: string[] = [];

    for (const p of products) {
      const sku = p.sku;
      let correctCategory: string | null = null;

      if (sku.match(/^(S-82|S-83|S-31|S-30|S-52|S-54|R-5|O-3)/) && !sku.endsWith('D')) {
        correctCategory = 'MONTURA_AUTOMATICA';
      } else if (sku.endsWith('D')) {
        correctCategory = 'FECHADOR';
      } else if (['S-722', 'S-723', 'S-724', 'Q-24', 'Q-32', 'EL-42'].includes(sku)) {
        correctCategory = 'PORTATIL';
      } else if (sku.startsWith('EM-') || sku.startsWith('ED-')) {
        correctCategory = 'EMBOSADORA';
      } else if (sku.startsWith('ALM-AUTO') || sku.startsWith('ALM-FEC')) {
        correctCategory = 'ALMOHADILLA_AUTOMATICA';
      } else if (sku.startsWith('ALM-S')) {
        correctCategory = 'ALMOHADILLA_MADERA';
      }

      if (correctCategory && p.category !== correctCategory) {
        await this.prisma.product.update({
          where: { id: p.id },
          data: { category: correctCategory as any },
        });
        updates.push(`${sku}: ${p.category} → ${correctCategory}`);
      }
    }

    return { fixed: updates.length, changes: updates };
  }
}
