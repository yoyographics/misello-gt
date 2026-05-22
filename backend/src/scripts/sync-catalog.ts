import { PrismaClient } from '@prisma/client';
import { CATALOG_PRODUCTS, CATEGORY_DEFINITIONS } from '../products/catalog-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Syncing catalog...');

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

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of CATALOG_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { sku: item.sku },
    });

    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`⚠️ Categoría no encontrada para ${item.sku}: ${item.categorySlug}`);
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
      await prisma.product.create({
        data: { sku: item.sku, ...data, stock: 100, isActive: true },
      });
      created++;
      console.log(`  + Creado: ${item.sku}`);
    } else {
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
        await prisma.product.update({
          where: { id: existing.id },
          data,
        });
        updated++;
        console.log(`  ~ Actualizado: ${item.sku}`);
      } else {
        unchanged++;
      }
    }
  }

  const total = await prisma.product.count();
  console.log(`\n✅ Sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged`);
  console.log(`📦 Total products in DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
