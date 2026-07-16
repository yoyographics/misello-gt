#!/bin/bash
# ============================================================
# BACKUP COMPLETO DE misello.gt EN RAILWAY
# ============================================================
# Este script respalda:
#   1. Base de datos PostgreSQL (datos completos)
#   2. Schema y migraciones de Prisma
#   3. Repositorio Git completo
#   4. Lista de variables de entorno a documentar
#
# USO:
#   1. Copia tu DATABASE_URL de Railway Dashboard
#   2. Pégala en la variable DATABASE_URL abajo
#   3. Guarda y ejecuta: bash scripts/backup-misello.sh
# ============================================================

# --------------------------------------------------
# CONFIGURACIÓN: PEGA AQUÍ TU DATABASE_URL DE RAILWAY
# --------------------------------------------------
# Ejemplo: postgresql://postgres:password@containers.railway.app:5432/railway
DATABASE_URL="PEGA_AQUI_TU_DATABASE_URL_DE_RAILWAY"

# Verificar que se configuró la URL
if [ "$DATABASE_URL" = "PEGA_AQUI_TU_DATABASE_URL_DE_RAILWAY" ]; then
    echo "❌ ERROR: Debes configurar DATABASE_URL en este script"
    echo "   1. Ve a railway.app → tu proyecto → PostgreSQL → Connect"
    echo "   2. Copia la 'Connection URL' (postgresql://...)"
    echo "   3. Edita este archivo y pégala en DATABASE_URL="
    exit 1
fi

# Crear carpeta de backup con fecha
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/misello_backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo ""
echo "=========================================="
echo "  BACKUP DE misello.gt"
echo "  Fecha: $(date)"
echo "=========================================="
echo ""

# ============================================================
# 1. BACKUP DE BASE DE DATOS (lo más importante)
# ============================================================
echo "📦 [1/5] Respaldando base de datos PostgreSQL..."
echo "    Esto puede tardar unos minutos..."

pg_dump "$DATABASE_URL" \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_DIR/database_full.sql" 2> "$BACKUP_DIR/pg_dump.log"

if [ $? -eq 0 ]; then
    SQL_SIZE=$(du -h "$BACKUP_DIR/database_full.sql" | cut -f1)
    echo "    ✅ Base de datos respaldada: $SQL_SIZE"
else
    echo "    ❌ ERROR al respaldar base de datos"
    echo "    Revisa: $BACKUP_DIR/pg_dump.log"
    exit 1
fi

# ============================================================
# 2. COMPRIMIR BASE DE DATOS
# ============================================================
echo ""
echo "📦 [2/5] Comprimiendo backup de base de datos..."

gzip "$BACKUP_DIR/database_full.sql"
GZ_SIZE=$(du -h "$BACKUP_DIR/database_full.sql.gz" | cut -f1)
echo "    ✅ Comprimido: $GZ_SIZE"

# ============================================================
# 3. BACKUP DE SCHEMA Y MIGRACIONES (desde tu repo local)
# ============================================================
echo ""
echo "📦 [3/5] Copiando schema y migraciones de Prisma..."

if [ -f "backend/prisma/schema.prisma" ]; then
    cp "backend/prisma/schema.prisma" "$BACKUP_DIR/"
    echo "    ✅ schema.prisma copiado"
else
    echo "    ⚠️  schema.prisma no encontrado (¿estás en la carpeta correcta?)"
fi

if [ -d "backend/prisma/migrations" ]; then
    cp -r "backend/prisma/migrations" "$BACKUP_DIR/"
    MIG_COUNT=$(ls -1 backend/prisma/migrations/ | wc -l)
    echo "    ✅ $MIG_COUNT migraciones copiadas"
else
    echo "    ⚠️  Carpeta de migraciones no encontrada"
fi

# ============================================================
# 4. BACKUP DEL REPOSITORIO GIT COMPLETO
# ============================================================
echo ""
echo "📦 [4/5] Creando bundle del repositorio Git..."

if [ -d ".git" ]; then
    git bundle create "$BACKUP_DIR/repo.bundle" --all 2> /dev/null
    if [ $? -eq 0 ]; then
        BUNDLE_SIZE=$(du -h "$BACKUP_DIR/repo.bundle" | cut -f1)
        echo "    ✅ Repo bundle creado: $BUNDLE_SIZE"
        echo "       (Para restaurar: git clone repo.bundle)"
    else
        echo "    ⚠️  No se pudo crear bundle (¿hay cambios sin commit?)"
    fi
else
    echo "    ⚠️  No es un repositorio Git"
fi

# ============================================================
# 5. DOCUMENTO DE VARIABLES DE ENTORNO
# ============================================================
echo ""
echo "📦 [5/5] Generando checklist de variables..."

cat > "$BACKUP_DIR/VARIABLES_CHECKLIST.md" << 'EOF'
# ============================================================
# CHECKLIST DE VARIABLES DE ENTORNO - misello.gt
# ============================================================
# Este archivo lista TODAS las variables que debes copiar manualmente
# desde Railway Dashboard para poder restaurar el proyecto.
#
# Para obtenerlas:
#   1. Ve a railway.app → tu proyecto
#   2. Cada servicio → pestaña "Variables"
#   3. Copia los valores uno por uno
# ============================================================

## 🔴 CRÍTICAS - Sin estas el proyecto no funciona

### Servicio: Backend (API)
- [ ] DATABASE_URL = (ya está en este backup como database.sql)
- [ ] JWT_SECRET =
- [ ] GOOGLE_CLIENT_ID =
- [ ] GOOGLE_CLIENT_SECRET =
- [ ] GOOGLE_CALLBACK_URL =
- [ ] NODE_ENV = production
- [ ] PORT = 3000

### Servicio: Frontend (Next.js)
- [ ] NEXT_PUBLIC_API_URL = (ej: https://misello-api.railway.app)
- [ ] NEXT_PUBLIC_GOOGLE_CLIENT_ID = (mismo que backend)

## 🟡 IMPORTANTES - Funcionalidad específica

### Pagos (Pagalo.gt)
- [ ] PAGALO_API_URL =
- [ ] PAGALO_API_KEY =
- [ ] PAGALO_BUSINESS_UUID =
- [ ] RECAPTCHA_SECRET_KEY =

### Facturación Electrónica (Tekra)
- [ ] TEKRA_API_URL =
- [ ] TEKRA_USUARIO =
- [ ] TEKRA_CLAVE =
- [ ] TEKRA_CLIENTE =
- [ ] TEKRA_CONTRATO =
- [ ] TEKRA_SEGUIMIENTO_URL =

### Correo Electrónico
- [ ] MAIL_HOST =
- [ ] MAIL_PORT = 587
- [ ] MAIL_USER =
- [ ] MAIL_PASSWORD =
- [ ] MAIL_FROM = noreply@misello.gt

### Cloudinary (Imágenes)
- [ ] CLOUDINARY_CLOUD_NAME =
- [ ] CLOUDINARY_API_KEY =
- [ ] CLOUDINARY_API_SECRET =

### Claude AI (Asistente de diseño)
- [ ] ANTHROPIC_API_KEY =
- [ ] CLAUDE_MODEL = claude-sonnet-4-6

## 🟢 CONFIGURACIÓN DE RAILWAY (no son variables, son settings)

### Dominios / URLs
- [ ] Dominio del backend: ___________________
- [ ] Dominio del frontend: ___________________
- [ ] ¿Custom domain configurado? Sí / No

### PostgreSQL
- [ ] Nombre de la base de datos: ___________________
- [ ] Plan de PostgreSQL: ___________________
- [ ] Tamaño aproximado de la BD: ___________________

### Deploy
- [ ] Auto-deploy desde branch: ___________________
- [ ] ¿Health checks configurados? Sí / No
- [ ] ¿Variables compartidas entre servicios? Sí / No

### Volúmenes / Storage (si aplica)
- [ ] ¿Hay archivos subidos a volúmenes de Railway? Sí / No
- [ ] Ruta de los volúmenes: ___________________

## 📋 NOTAS ADICIONALES

- Fecha de este backup: ___________________
- Responsable: ___________________
- Próximo backup programado: ___________________
- Ubicación de archivos de Cloudinary: Ya en la nube (no necesitan backup)

## 🔧 RESTAURACIÓN RÁPIDA

Si necesitas restaurar en un nuevo servidor:

1. **Base de datos:**
   ```bash
   psql "nueva_database_url" < database_full.sql
   ```

2. **Código:**
   ```bash
   git clone repo.bundle misello-restaurado
   cd misello-restaurado
   ```

3. **Variables:**
   - Crear archivo `.env` en backend con todas las variables arriba
   - Crear archivo `.env.local` en frontend con las públicas

4. **Migraciones:**
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

5. **Deploy:**
   ```bash
   npm run build  # backend y frontend
   ```
EOF

echo "    ✅ Checklist generado: VARIABLES_CHECKLIST.md"

# ============================================================
# RESUMEN FINAL
# ============================================================
echo ""
echo "=========================================="
echo "  ✅ BACKUP COMPLETADO"
echo "=========================================="
echo ""
echo "📁 Ubicación: $BACKUP_DIR"
echo ""
echo "Contenido:"
ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "⚠️  ACCIONES PENDIENTES MANUALES:"
echo "   1. Copia las variables de Railway Dashboard al archivo:"
echo "      $BACKUP_DIR/VARIABLES_CHECKLIST.md"
echo "   2. Verifica que Cloudinary tenga tus imágenes"
echo "   3. Guarda este backup en un lugar seguro (Drive, Dropbox, etc.)"
echo ""
echo "💡 Para restaurar la base de datos:"
echo "   psql \"nueva_url\" < database_full.sql"
echo ""
