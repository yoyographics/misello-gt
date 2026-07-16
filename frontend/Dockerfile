# ============================================================
# FRONTEND DOCKERFILE - misello.gt (Next.js 14 export)
# ============================================================
# El frontend usa 'output: export' (sitio estático).
# Next.js export genera en la carpeta 'out/' por defecto.
# ============================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm ci

# Copiar todo el código
COPY . .

# Build estático (output: export genera carpeta 'out/')
RUN npm run build

# ============================================================
# Servir con Nginx (ligero y rápido para sitios estáticos)
# ============================================================
FROM nginx:alpine

# Next.js 'output: export' genera archivos en 'out/'
COPY --from=builder /app/out /usr/share/nginx/html

# Configuración de Nginx para SPA (Single Page Application) con rutas
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
