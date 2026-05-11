import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.product.updateMany({ data: { stock: 100 } });
  console.log('Updated', result.count, 'products with stock=100');
}
main().catch(console.error).finally(() => prisma.$disconnect());
