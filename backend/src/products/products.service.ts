import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';


const ALLOWED_PRODUCT_SORT_FIELDS = ['createdAt', 'name', 'sku', 'basePrice', 'stock'] as const;
type ProductSortField = typeof ALLOWED_PRODUCT_SORT_FIELDS[number];

function buildProductOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  if (!sortBy || !ALLOWED_PRODUCT_SORT_FIELDS.includes(sortBy as ProductSortField)) {
    return { createdAt: sortOrder };
  }
  return { [sortBy]: sortOrder };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly CLOUDINARY_FOLDER = 'MI SELLO';

  private getCategoryFolder(categorySlug: string): string {
    const map: Record<string, string> = {
      'sello-automatico': 'sellos-automaticos',
      'sello-fechador': 'fechadores',
      'sello-portatil': 'sellos-portatiles',
      'sello-madera': 'sellos-madera',
      'tintas': 'tintas',
      'embosadora': 'embosadoras',
      'almohadillas': 'almohadillas',
    };
    return map[categorySlug] || 'otros';
  }

  private toWebpUrl(cloudinaryUrl: string): string {
    // Convierte la URL de Cloudinary a WebP con calidad auto
    // https://res.cloudinary.com/.../image/upload/v123/... → /image/upload/f_webp,q_auto/v123/...
    return cloudinaryUrl.replace('/upload/', '/upload/f_webp,q_auto/');
  }

  async findAllPublic(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.shape) where.shape = query.shape;
    if (query.search) {
      const search = query.search.trim();
      // Buscar por nombre, SKU, forma, o medidas (ej: "38x14", "38 x 14", "38")
      const measurementMatch = search.match(/(\d+(?:\.\d+)?)\s*[xX\*]\s*(\d+(?:\.\d+)?)/);
      const singleNumber = !measurementMatch && /^\d+(?:\.\d+)?$/.test(search);

      const orConditions: any[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];

      if (measurementMatch) {
        const w = parseFloat(measurementMatch[1]);
        const h = parseFloat(measurementMatch[2]);
        orConditions.push(
          { widthMm: { gte: w - 1, lte: w + 1 } },
          { heightMm: { gte: h - 1, lte: h + 1 } },
        );
      } else if (singleNumber) {
        const n = parseFloat(search);
        orConditions.push(
          { widthMm: { gte: n - 1, lte: n + 1 } },
          { heightMm: { gte: n - 1, lte: n + 1 } },
        );
      }

      where.OR = orConditions;
    }

    // Ordenar: en "Todas las categorías" primero por sortOrder de categoría
    // para que Sellos Automáticos (sortOrder=1) aparezcan siempre primero.
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
    if (!query.categoryId) {
      orderBy.push({ category: { sortOrder: 'asc' } });
    }
    if (query.sortBy && ALLOWED_PRODUCT_SORT_FIELDS.includes(query.sortBy as ProductSortField)) {
      const sortField = query.sortBy as ProductSortField;
      orderBy.push({ [sortField]: query.sortOrder || 'desc' } as Prisma.ProductOrderByWithRelationInput);
    } else {
      orderBy.push({ createdAt: query.sortOrder || 'desc' });
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy,
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async findAllAdmin(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.shape) where.shape = query.shape;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      const search = query.search.trim();
      // Buscar por nombre, SKU, forma, o medidas (ej: "38x14", "38 x 14", "38")
      const measurementMatch = search.match(/(\d+(?:\.\d+)?)\s*[xX\*]\s*(\d+(?:\.\d+)?)/);
      const singleNumber = !measurementMatch && /^\d+(?:\.\d+)?$/.test(search);

      const orConditions: any[] = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];

      if (measurementMatch) {
        const w = parseFloat(measurementMatch[1]);
        const h = parseFloat(measurementMatch[2]);
        orConditions.push(
          { widthMm: { gte: w - 1, lte: w + 1 } },
          { heightMm: { gte: h - 1, lte: h + 1 } },
        );
      } else if (singleNumber) {
        const n = parseFloat(search);
        orConditions.push(
          { widthMm: { gte: n - 1, lte: n + 1 } },
          { heightMm: { gte: n - 1, lte: n + 1 } },
        );
      }

      where.OR = orConditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: buildProductOrderBy(query.sortBy, query.sortOrder),
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, skip: query.skip, take: query.take };
  }

  async findOnePublic(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async findAllAdminSimple() {
    const items = await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { items, total: items.length };
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

    const category = await this.prisma.category.findUnique({
      where: { id: product.categoryId },
    });
    const subFolder = this.getCategoryFolder(category?.slug || '');
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


}
