import { PrismaClient, ProductShape } from '@prisma/client';
import { CATALOG_PRODUCTS, CATEGORY_DEFINITIONS } from '../products/catalog-data';

const prisma = new PrismaClient();

const inks = [
  { code: 'S-61', color: 'Negro', hexCode: '#000000', price: 40, stock: 100 },
  { code: 'S-62', color: 'Rojo', hexCode: '#CF001D', price: 40, stock: 100 },
  { code: 'S-63', color: 'Azul', hexCode: '#002183', price: 40, stock: 100 },
  { code: 'S-64', color: 'Violeta', hexCode: '#700069', price: 40, stock: 100 },
  { code: 'S-65', color: 'Verde', hexCode: '#004F27', price: 40, stock: 100 },
  { code: 'SR-1', color: 'Vino', hexCode: '#700039', price: 40, stock: 100 },
  { code: 'SR-2', color: 'Café', hexCode: '#4A0000', price: 40, stock: 100 },
  { code: 'SR-3', color: 'Amarillo', hexCode: '#FDF63F', price: 40, stock: 100 },
  { code: 'SR-4', color: 'Menta', hexCode: '#BADCCF', price: 40, stock: 100 },
  { code: 'SR-5', color: 'Naranja', hexCode: '#E17600', price: 40, stock: 100 },
  { code: 'SR-6', color: 'Rosa', hexCode: '#DF4889', price: 40, stock: 100 },
  { code: 'SR-7', color: 'Turquesa', hexCode: '#0094D6', price: 40, stock: 100 },
];

async function main() {
  console.log('🌱 Seeding products and inks...');

  // 1. Ensure categories exist
  const categoryMap = new Map<string, string>();
  for (const def of CATEGORY_DEFINITIONS) {
    const cat = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    });
    categoryMap.set(def.slug, cat.id);
  }

  // Clear existing products and inks
  await prisma.product.deleteMany({});
  await prisma.ink.deleteMany({});

  for (const item of CATALOG_PRODUCTS) {
    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`⚠️ Categoría no encontrada para ${item.sku}: ${item.categorySlug}`);
      continue;
    }

    await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        categoryId,
        shape: item.shape as ProductShape | null,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        widthPx: item.widthPx,
        heightPx: item.heightPx,
        basePrice: item.basePrice,
        stock: 100,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${CATALOG_PRODUCTS.length} products created`);

  for (const i of inks) {
    await prisma.ink.create({ data: i });
  }
  console.log(`✅ ${inks.length} inks created`);

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
