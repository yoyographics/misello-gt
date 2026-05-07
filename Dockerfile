# ============================================================
# Dockerfile simplificado de una sola etapa para Railway
# ============================================================

FROM node:20-alpine

# Instalar herramientas de compilación para paquetes nativos (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar TODAS las dependencias (incluyendo devDependencies para compilar)
RUN npm install

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente
COPY backend/src ./src/
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/.prettierrc ./
COPY backend/eslint.config.mjs ./

# Compilar el proyecto
RUN npm run build

# Verificar que el build se generó correctamente
RUN ls -la dist/

# Crear carpetas para uploads
RUN mkdir -p uploads/fonts uploads/logos uploads/designs uploads/receipts uploads/product-photos

# Puerto expuesto
EXPOSE 3000

# Comando de inicio (migraciones + servidor)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
