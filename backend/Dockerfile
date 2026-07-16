# ============================================================
# BACKEND DOCKERFILE - misello.gt
# ============================================================
# Construye la API NestJS con Prisma.
# Incluye: Node.js 20, dependencias, build, y migraciones automáticas.
# ============================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma y bcrypt
RUN apk add --no-cache python3 make g++ openssl

# Copiar archivos de dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci

# Copiar todo el código fuente
COPY . .

# Generar cliente Prisma y compilar
RUN npx prisma generate && npm run build

# ============================================================
# Imagen de producción (más ligera)
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

# Instalar solo lo necesario para Prisma en runtime
RUN apk add --no-cache openssl

# Copiar desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Puerto expuesto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando por defecto (se sobrescribe en docker-compose.yml)
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma generate && node dist/src/main"]
