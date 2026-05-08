import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

/**
 * Script para crear el primer usuario administrador desde la terminal.
 * Uso: npx ts-node src/scripts/create-admin.ts
 *
 * Este script es de una sola vez para el equipo de IT.
 */
const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('========================================');
  console.log('  Crear Administrador — misello.gt');
  console.log('========================================\n');

  const email = await ask('Correo electrónico: ');
  const name = await ask('Nombre completo: ');
  const password = await ask('Contraseña: ');

  if (!email || !name || !password) {
    console.error('\n❌ Error: Todos los campos son obligatorios.');
    process.exit(1);
  }

  // Validar formato básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('\n❌ Error: El correo electrónico no tiene un formato válido.');
    process.exit(1);
  }

  // Verificar que no exista otro admin con el mismo email
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.error('\n❌ Error: Ya existe un administrador con ese correo.');
    process.exit(1);
  }

  // Hashear la contraseña
  const passwordHash = await bcrypt.hash(password, 12);

  // Crear el administrador
  const admin = await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('\n✅ Administrador creado exitosamente:');
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Nombre: ${admin.name}`);
  console.log(`   Rol:   ${admin.role}`);
  console.log('\n========================================');
}

main()
  .catch((e) => {
    console.error('\n❌ Error inesperado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    rl.close();
  });
