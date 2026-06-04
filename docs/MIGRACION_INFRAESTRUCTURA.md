# 🚀 Guía de Migración de Infraestructura — misello.gt

> **Objetivo:** Salir de Railway en minutos sin perder datos ni configuración.
> Esta guía te permite levantar el proyecto en **cualquier VPS, Docker, Render, Fly.io, o local**.

---

## 📦 Qué hemos preparado

Hemos creado 3 archivos que hacen el proyecto 100% portable:

| Archivo | Propósito |
|---------|-----------|
| `docker-compose.yml` | Levanta PostgreSQL + Backend con un solo comando |
| `Dockerfile` | Multi-stage build: compila frontend + backend en una sola imagen |
| `scripts/backup-railway.sh` | Exporta BD + variables de Railway en un solo script |

---

## 🔴 PASO 1: Backup de Railway (hazlo HOY)

### 1.1 Instalar herramientas necesarias

```bash
# Railway CLI
npm install -g @railway/cli

# PostgreSQL client (incluye pg_dump)
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client
```

### 1.2 Login en Railway

```bash
railway login
# Te abrirá el navegador para autenticar
```

### 1.3 Ir al directorio del proyecto y linkear

```bash
cd C:/PROYECTOS/misello-gt
railway link
# Selecciona tu proyecto "misello-gt"
```

### 1.4 Ejecutar backup

```bash
# En Git Bash / WSL / Linux / Mac:
chmod +x scripts/backup-railway.sh
./scripts/backup-railway.sh

# En Windows PowerShell (si no tienes Bash):
# Copia manualmente las variables desde Railway Dashboard
# y usa pg_dump directamente (ver sección manual más abajo)
```

Esto crea:
```
backups/20260603_143000/
├── railway-env.json      # Variables de entorno
└── database.dump         # Base de datos completa
```

**⚠️ GUARDA ESTA CARPETA EN MÚLTIPLES LUGARES** (Google Drive, USB, etc.)

---

## 🔴 PASO 2: Backup manual (si el script falla)

### Variables de entorno (manual)
1. Ve a https://railway.app/project
2. Entra a tu proyecto → Variables
3. Copia TODAS las variables en un archivo seguro (nunca lo subas a Git)

### Base de datos (manual)
```bash
# Obtener DATABASE_URL
railway variables --json

# Exportar con pg_dump
pg_dump "postgresql://user:pass@host:port/db" --format=custom --file=misello_backup.dump
```

---

## 🟢 PASO 3: Levantar localmente con Docker (prueba)

```bash
cd C:/PROYECTOS/misello-gt

# 1. Crear archivo .env en backend/
cp backend/.env.example backend/.env
# Editar backend/.env con valores locales

# 2. Buildear y levantar
docker-compose up --build

# 3. Abrir en navegador
http://localhost:3000
```

El `docker-compose.yml` levanta:
- **PostgreSQL 16** en puerto 5432
- **Backend** en puerto 3000 (sirve API + frontend estático)

---

## 🟡 PASO 4: Migrar a otra plataforma

### Opción A: Render (gratis, recomendado)

Render tiene un **free tier** que no expira (duerme después de 15 min de inactividad, se despierta con el primer request).

1. Crear cuenta en https://render.com
2. **New Web Service** → conectar repo de GitHub
3. Configurar:
   - **Build Command:** `npm ci --legacy-peer-deps && npx prisma generate && npm run build`
   - **Start Command:** `npx prisma migrate deploy && node dist/src/main`
   - **Root Directory:** `backend`
4. Agregar variables de entorno desde tu backup
5. **New PostgreSQL** → copiar `INTERNAL_CONNECTION_STRING` a `DATABASE_URL`
6. Para el frontend: **New Static Site** → root `frontend`, build `npm run build`, publish `out`

### Opción B: Fly.io (gratis, más potente)

Fly.io da $5/mes de créditos gratis (suficiente para una app pequeña).

```bash
# Instalar Fly CLI
winget install Fly-io.flyctl   # Windows
brew install flyctl            # Mac
curl -L https://fly.io/install.sh | sh  # Linux

# Login
flyctl auth login

# Lanzar
flyctl launch
# Seguir wizard, seleccionar region más cercana (santiago o bogota)

# Crear PostgreSQL
flyctl postgres create --name misello-db

# Conectar DB a la app
flyctl postgres attach misello-db

# Deploy
flyctl deploy
```

### Opción C: Vercel (frontend) + Supabase (BD) + Render (backend)

Esta es la opción **más gratuita y escalable**:

| Servicio | Rol | Costo |
|----------|-----|-------|
| **Vercel** | Frontend Next.js (static export) | **Gratis** |
| **Supabase** | PostgreSQL + Auth + Storage | **Gratis** (500MB, luego $25/mes) |
| **Render** | Backend NestJS API | **Gratis** (sleeps after 15min) |

**Configuración:**
1. **Vercel:** Importar repo → framework preset "Next.js" → build command override: `cd frontend && npm run build` → output directory: `frontend/out`
2. **Supabase:** New project → copiar `Connection string` a `DATABASE_URL` en Render
3. **Render:** New Web Service → repo → root dir `backend` → start command `npx prisma migrate deploy && node dist/src/main`

### Opción D: VPS propio (DigitalOcean, Linode, Hetzner)

Más barato a largo plazo (~$5-6/mes).

```bash
# En el VPS (Ubuntu 22.04)
git clone https://github.com/yoyographics/misello-gt.git
cd misello-gt

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Copiar backup de Railway
scp backups/20260603_143000/database.dump usuario@vps-ip:/home/usuario/

# Restaurar BD
docker-compose up -d postgres
sleep 10
docker exec -i misello-postgres pg_restore -U misello -d misello_db < database.dump

# Configurar .env
cp backend/.env.example backend/.env
nano backend/.env  # completar con valores de railway-env.json

# Levantar todo
docker-compose up -d

# Instalar nginx como reverse proxy (opcional pero recomendado)
sudo apt-get install nginx
# Configurar /etc/nginx/sites-available/misello con SSL vía Let's Encrypt
```

---

## 📋 Checklist de migración

Antes de apagar Railway:

- [ ] Backup de BD exportado (`database.dump`)
- [ ] Backup de variables de entorno (`railway-env.json` o copia manual)
- [ ] Backup de archivos subidos (`uploads/` folder) — descargar desde Railway Dashboard
- [ ] Probar la nueva plataforma con datos reales
- [ ] Verificar que login con Google funciona (actualizar `GOOGLE_CALLBACK_URL`)
- [ ] Verificar que pagos funcionan (actualizar URLs de webhook del proveedor)
- [ ] Configurar dominio personalizado (si aplica)
- [ ] Configurar SSL/HTTPS
- [ ] Apagar Railway SOLO después de confirmar que todo funciona

---

## 💰 Comparativa de costos mensuales

| Plataforma | Costo estimado | Pros | Contras |
|------------|---------------|------|---------|
| **Railway** | $5-20/mes | Fácil, escalable | Trial limitado, costo impredecible |
| **Render (free)** | $0 | Gratis forever | Sleep después de 15min, lento al despertar |
| **Render (starter)** | $7/mes + BD $15 | Siempre awake | Más caro que VPS |
| **Fly.io** | $0-5/mes | Potente, edge CDN | Curva de aprendizaje |
| **Vercel + Supabase + Render** | $0 | Todo gratis | Más piezas que administrar |
| **VPS (Hetzner)** | €4.51 (~$5) | Potente, siempre awake | Tú administras todo |

**Recomendación para Guatemala:**
- **Fase pruebas:** Render free tier o Fly.io free
- **Fase producción:** VPS en Hetzner ($5/mes) o DigitalOcean Droplet ($6/mes)
- **Si quieres 100% gratis:** Vercel (frontend) + Supabase (BD 500MB) + Render (backend free)

---

## 🆘 Troubleshooting

### "pg_dump no está instalado"
Descarga PostgreSQL para Windows desde https://www.postgresql.org/download/windows/ e instala solo los clientes (no necesitas el servidor completo).

### " railway login no funciona"
Usa el navegador: `railway login --browserless` y pega el token.

### "database.dump es muy grande"
Usa compresión: `pg_dump ... | gzip > database.dump.gz`

### "Error al restaurar: database already exists"
```bash
# En el nuevo servidor
docker exec -i misello-postgres dropdb -U misello misello_db
docker exec -i misello-postgres createdb -U misello misello_db
docker exec -i misello-postgres pg_restore -U misello -d misello_db < database.dump
```

---

## 🔗 Referencias

- [Railway CLI Docs](https://docs.railway.app/reference/cli)
- [Render Docs](https://render.com/docs)
- [Fly.io Docs](https://fly.io/docs/)
- [Vercel Next.js](https://vercel.com/docs/frameworks/nextjs)
- [Supabase Pricing](https://supabase.com/pricing)
- [Hetzner Cloud](https://www.hetzner.com/cloud/)
