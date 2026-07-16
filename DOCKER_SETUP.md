# ============================================================
# GUÍA DE INSTALACIÓN LOCAL CON DOCKER
# misello.gt en tu servidor Linux
# ============================================================

## 1. REQUISITOS EN TU SERVIDOR LINUX

```bash
# Verificar que Docker está instalado
docker --version
docker compose version

# Si no está instalado (Ubuntu/Debian):
sudo apt update
sudo apt install docker.io docker-compose-plugin -y
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que el grupo docker aplique
```

## 2. CLONAR EL REPOSITORIO

```bash
cd ~
git clone https://github.com/yoyographics/misello-gt.git
cd misello-gt
```

## 3. CONFIGURAR VARIABLES DE ENTORNO

```bash
# Copiar el archivo de ejemplo
cp backend/.env.example backend/.env

# Editar con tus valores reales (Cloudinary, JWT, etc.)
nano backend/.env
```

**Mínimo necesario para funcionar:**
```env
DATABASE_URL=postgresql://misello:misello_local_2024@postgres:5432/misello_db
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=7d
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# Cloudinary (necesario para imágenes de productos)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

## 4. CONSTRUIR Y LEVANTAR

```bash
# Construir imágenes y levantar todo
docker compose up -d --build

# Ver logs
docker compose logs -f

# Ver estado de los contenedores
docker compose ps
```

## 5. ACCEDER A LA APLICACIÓN

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://IP_SERVIDOR:3001 | Sitio web del cliente |
| Backend API | http://IP_SERVIDOR:3000 | API REST |
| PostgreSQL | IP_SERVIDOR:5432 | Base de datos (desde fuera) |

## 6. COMANDOS ÚTILES

```bash
# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Entrar al contenedor del backend
docker exec -it misello-backend sh

# Ejecutar comandos Prisma manualmente
docker exec -it misello-backend npx prisma studio

# Reiniciar un servicio
docker compose restart backend

# Detener todo
docker compose down

# Detener y borrar base de datos (⚠️ PELIGROSO)
docker compose down -v

# Actualizar después de un git pull
git pull
docker compose up -d --build
```

## 7. RESTAURAR BACKUP DE BASE DE DATOS

```bash
# Copiar tu backup .sql al contenedor
docker cp backups/misello_backup_20250708.sql misello-postgres:/tmp/backup.sql

# Ejecutar restore
docker exec -it misello-postgres psql -U misello -d misello_db -f /tmp/backup.sql
```

## 8. ACCEDER DESDE TU RED LOCAL

Si tu servidor Linux tiene IP `192.168.1.100`:

```
Desde cualquier computadora en tu red:
  http://192.168.1.100:3001  → Frontend
  http://192.168.1.100:3000  → API
```

## 9. ESTRUCTURA DE LOS CONTENEDORES

```
┌─────────────────────────────────────────┐
│           Docker Network                │
│  ┌──────────┐  ┌──────────┐          │
│  │  Nginx   │  │  NestJS  │          │
│  │  :3001   │  │  :3000   │          │
│  │(Frontend)│  │(Backend) │          │
│  └──────────┘  └──────────┘          │
│       │              │                 │
│       └──────────────┘                 │
│              │                          │
│       ┌──────────┐                      │
│       │PostgreSQL│                      │
│       │  :5432   │                      │
│       └──────────┘                      │
└─────────────────────────────────────────┘
```

## 10. SOLUCIÓN DE PROBLEMAS

### Error: "port already in use"
```bash
# Ver qué usa el puerto 3000
sudo lsof -i :3000
# Cambiar el puerto en docker-compose.yml si es necesario
```

### Error: "permission denied"
```bash
# Asegurarte de estar en el grupo docker
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar
```

### Frontend no carga (404)
Verifica que el build generó archivos en `frontend/dist/` o `frontend/out/`.
Si usa `out/`, edita el Dockerfile del frontend.

### Backend no conecta a PostgreSQL
```bash
# Verificar que postgres está healthy
docker compose ps
# Ver logs
docker compose logs postgres
```
