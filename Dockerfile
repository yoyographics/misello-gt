# ============================================================
# Dockerfile — misello.gt Backend + Frontend
# Multi-stage build: compila frontend y backend, luego los une.
# ============================================================

# ── Stage 1: Build Frontend ──
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copiar package.json e instalar dependencias
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar código fuente del frontend y buildear
COPY frontend/ ./
RUN npm run build
# El output va a /app/frontend/out (Next.js static export)

# ── Stage 2: Build Backend ──
FROM node:20-slim AS backend-builder
WORKDIR /app/backend

# Copiar package.json e instalar dependencias (incluyendo devDependencies para compilar)
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps

# Copiar código fuente del backend y prisma schema
COPY backend/ ./

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript a JavaScript
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-slim AS production
WORKDIR /app

# Instalar solo dependencias de producción
COPY backend/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copiar Prisma schema y cliente generado
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copiar código compilado del backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar frontend estático al directorio public/ del backend
# El backend sirve express.static desde process.cwd()/public
COPY --from=frontend-builder /app/frontend/out ./public

# Crear directorio para uploads
RUN mkdir -p /app/uploads

# Puerto expuesto
EXPOSE 3000

# Comando de inicio: aplicar migraciones y levantar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
