# ============================================================
# Dockerfile en raíz para Railway
# Railway detecta automáticamente este archivo en la raíz del repo
# ============================================================

# --------------------------------------------------
# Etapa 1: Build
# --------------------------------------------------
FROM node:20-alpine AS builder

# Instalar herramientas de compilación para paquetes nativos (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar solo archivos de dependencias primero (mejor cache de Docker)
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar dependencias
RUN npm install

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente (ignorando node_modules gracias a .dockerignore)
COPY backend/src ./src/
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/.prettierrc ./
COPY backend/eslint.config.mjs ./

# Compilar el proyecto
RUN npm run build

# Verificar que se generó el build correctamente
RUN ls -la dist/

# --------------------------------------------------
# Etapa 2: Producción
# --------------------------------------------------
FROM node:20-alpine AS production

# Instalar herramientas de compilación (necesarias para algunos paquetes nativos en runtime)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Instalar SOLO dependencias de producción
RUN npm install --only=production && npm cache clean --force

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
