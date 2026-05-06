import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed de productos: se completará en el Prompt 2 (Catálogo)
  console.log('🌱 Seed ejecutado. El catálogo de productos se cargará en el Prompt 2.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
