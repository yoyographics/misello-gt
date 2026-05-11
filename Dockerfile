# ============================================================
# Dockerfile multi-etapa: Frontend Next.js + Backend NestJS
# ============================================================

# ── ETAPA 1: Build del Frontend Next.js ──
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── ETAPA 2: Build del Backend NestJS ──
FROM node:20-alpine AS backend-builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Dependencias del backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm install
RUN npx prisma generate

# Copiar código fuente del backend
COPY backend/src ./src/
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./

# Copiar frontend buildado desde etapa 1 al public/ del backend
COPY --from=frontend-builder /frontend/out ./public/

# Compilar backend
RUN npm run build

# ── ETAPA 3: Imagen final de produccion ──
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copiar solo lo necesario
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/prisma ./prisma
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/public ./public

# Crear carpetas para uploads
RUN mkdir -p uploads/fonts uploads/logos uploads/designs uploads/receipts uploads/product-photos

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
