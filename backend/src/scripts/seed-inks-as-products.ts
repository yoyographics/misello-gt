import { PrismaClient } from '@prisma/client';

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
  console.log('🌱 Seeding inks as catalog products...');

  // Find or create "tintas" category
  let category = await prisma.category.findUnique({ where: { slug: 'tintas' } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Tintas',
        slug: 'tintas',
        description: 'Tintas de alta calidad para sellos',
        sortOrder: 99,
        isActive: true,
        showInStore: true,
        showInWizard: false,
        isCustomizable: false,
      },
    });
    console.log('✅ Category "tintas" created');
  } else {
    console.log('ℹ️ Category "tintas" already exists');
  }

  let created = 0;
  let skipped = 0;

  for (const ink of inks) {
    const existing = await prisma.product.findUnique({ where: { sku: ink.code } });
    if (existing) {
      console.log(`  ⏭️  Skipping ${ink.code} - already exists`);
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        sku: ink.code,
        name: `Tinta ${ink.color}`,
        description: `Tinta para sellos color ${ink.color} — Código ${ink.code}`,
        categoryId: category.id,
        basePrice: ink.price,
        stock: ink.stock,
        isActive: true,
        cardLabel: ink.color,
      },
    });
    console.log(`  ✅ Created ${ink.code} - Tinta ${ink.color}`);
    created++;
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
