import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@yoyographics.com';
  const name = 'Administrador';
  const password = 'Admin123!';

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log('⚠️ Ya existe un administrador con ese correo.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Administrador creado exitosamente:');
  console.log(`   ID:     ${admin.id}`);
  console.log(`   Email:  ${admin.email}`);
  console.log(`   Nombre: ${admin.name}`);
  console.log(`   Rol:    ${admin.role}`);
  console.log(`   Pass:   ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
