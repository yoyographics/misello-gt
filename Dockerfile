# ============================================================
# Dockerfile en raíz para Railway
# Railway detecta automáticamente este archivo en la raíz del repo
# y usa el builder Docker en lugar de Railpack.
# ============================================================

# --------------------------------------------------
# Etapa 1: Build
# --------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias desde backend/
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente desde backend/ y compilar
COPY backend/. .
RUN npm run build

# --------------------------------------------------
# Etapa 2: Producción
# --------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Copiar archivos de dependencias
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar SOLO dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Generar cliente Prisma (necesario en runtime)
RUN npx prisma generate

# Copiar archivos compilados desde la etapa de build
COPY --from=builder /app/dist ./dist

# Crear carpetas para uploads
RUN mkdir -p uploads/fonts uploads/logos uploads/designs uploads/receipts uploads/product-photos

# Puerto expuesto
EXPOSE 3000

# Comando de inicio (migraciones + servidor)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
