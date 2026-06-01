import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CATALOG_PRODUCTS, CATEGORY_DEFINITIONS } from './catalog-data';

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
      include: { category: true },
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

  /**
   * Sincroniza el catálogo completo con la base de datos.
   * Usa upsert por SKU: crea productos nuevos, actualiza existentes,
   * preserva campos que el admin haya modificado (imágenes, stock, isActive).
   */
  async syncCatalog() {
    // 1. Asegurar que todas las categorías existen
    const categoryMap = new Map<string, string>();
    for (const def of CATEGORY_DEFINITIONS) {
      const cat = await this.prisma.category.upsert({
        where: { slug: def.slug },
        update: {},
        create: def,
      });
      categoryMap.set(def.slug, cat.id);
    }

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const errors: string[] = [];

    for (const item of CATALOG_PRODUCTS) {
      try {
        const existing = await this.prisma.product.findUnique({
          where: { sku: item.sku },
        });

        const categoryId = categoryMap.get(item.categorySlug);
        if (!categoryId) {
          errors.push(`${item.sku}: categoría no encontrada para slug ${item.categorySlug}`);
          continue;
        }

        const data = {
          name: item.name,
          categoryId,
          shape: item.shape,
          widthMm: item.widthMm,
          heightMm: item.heightMm,
          widthPx: item.widthPx,
          heightPx: item.heightPx,
          basePrice: item.basePrice,
        };

        if (!existing) {
          await this.prisma.product.create({
            data: {
              sku: item.sku,
              ...data,
              stock: 100,
              isActive: true,
            },
          });
          created++;
        } else {
          // Solo actualizar si hay cambios reales en los campos del catálogo
          const hasChanges =
            existing.name !== data.name ||
            existing.categoryId !== data.categoryId ||
            existing.shape !== data.shape ||
            existing.widthMm !== data.widthMm ||
            existing.heightMm !== data.heightMm ||
            existing.widthPx !== data.widthPx ||
            existing.heightPx !== data.heightPx ||
            existing.basePrice !== data.basePrice;

          if (hasChanges) {
            await this.prisma.product.update({
              where: { id: existing.id },
              data,
            });
            updated++;
          } else {
            unchanged++;
          }
        }
      } catch (err: any) {
        errors.push(`${item.sku}: ${err.message}`);
      }
    }

    const totalInDb = await this.prisma.product.count();

    return {
      created,
      updated,
      unchanged,
      errors,
      totalCatalog: CATALOG_PRODUCTS.length,
      totalInDb,
    };
  }
}
