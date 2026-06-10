import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CATALOG_PRODUCTS, CATEGORY_DEFINITIONS } from './catalog-data';

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

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: buildProductOrderBy(query.sortBy, query.sortOrder),
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
  async seedInks() {
    const inksData = [
      { code: 'S-61', color: 'Negro', hexCode: '#000000', price: 40, stock: 100 },
      { code: 'S-62', color: 'Rojo', hexCode: '#CF001D', price: 40, stock: 100 },
      { code: 'S-63', color: 'Azul', hexCode: '#002183', price: 40, stock: 100 },
      { code: 'S-64', color: 'Violeta', hexCode: '#700069', price: 40, stock: 100 },
      { code: 'S-65', color: 'Verde', hexCode: '#004F27', price: 40, stock: 100 },
      { code: 'SR-1', color: 'Vino', hexCode: '#700039', price: 40, stock: 100 },
      { code: 'SR-2', color: 'Cafe', hexCode: '#4A0000', price: 40, stock: 100 },
      { code: 'SR-3', color: 'Amarillo', hexCode: '#FDF63F', price: 40, stock: 100 },
      { code: 'SR-4', color: 'Menta', hexCode: '#BADCCF', price: 40, stock: 100 },
      { code: 'SR-5', color: 'Naranja', hexCode: '#E17600', price: 40, stock: 100 },
      { code: 'SR-6', color: 'Rosa', hexCode: '#DF4889', price: 40, stock: 100 },
      { code: 'SR-7', color: 'Turquesa', hexCode: '#0094D6', price: 40, stock: 100 },
    ];

    // 1. Find or create tintas category
    let tintasCategory = await this.prisma.category.findUnique({
      where: { slug: 'tintas' },
    });
    if (!tintasCategory) {
      tintasCategory = await this.prisma.category.create({
        data: { name: 'Tintas', slug: 'tintas', sortOrder: 99, showInStore: true },
      });
    }

    const results = { inksCreated: 0, productsCreated: 0, errors: [] as string[] };

    for (const ink of inksData) {
      try {
        // Create/update ink
        await this.prisma.ink.upsert({
          where: { code: ink.code },
          update: {},
          create: ink,
        });
        results.inksCreated++;

        // Create product for ink if not exists
        const existingProduct = await this.prisma.product.findUnique({
          where: { sku: ink.code },
        });
        if (!existingProduct) {
          await this.prisma.product.create({
            data: {
              sku: ink.code,
              name: `Tinta ${ink.color}`,
              categoryId: tintasCategory.id,
              basePrice: ink.price,
              stock: ink.stock,
              isActive: true,
              description: `Tinta de sello color ${ink.color}. Compatible con sellos automaticos, portatiles y fechadores.`,
              cardLabel: ink.color,
            },
          });
          results.productsCreated++;
        }
      } catch (err: any) {
        results.errors.push(`${ink.code}: ${err.message}`);
      }
    }

    return results;
  }

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
