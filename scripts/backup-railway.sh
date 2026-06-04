#!/bin/bash
# ============================================================
# backup-railway.sh
# Exporta la base de datos de Railway y las variables de entorno.
# Guarda todo en la carpeta backups/ con fecha.
#
# Uso:
#   chmod +x scripts/backup-railway.sh
#   ./scripts/backup-railway.sh
#
# Requiere:
#   - Railway CLI instalado: npm install -g @railway/cli
#   - Logueado en Railway: railway login
#   - pg_dump (viene con PostgreSQL): https://www.postgresql.org/download/
# ============================================================

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "🚀 Iniciando backup de Railway"
echo "📁 Destino: ${BACKUP_DIR}"
echo "=========================================="

# ── 1. Backup de variables de entorno ──
echo ""
echo "📋 [1/3] Exportando variables de entorno..."
railway variables --json > "${BACKUP_DIR}/railway-env.json" 2>/dev/null || {
    echo "⚠️  No se pudieron exportar variables vía CLI."
    echo "    Copia manual desde el dashboard de Railway:"
    echo "    https://railway.app/project → Variables"
}
echo "✅ Variables exportadas (o instrucciones generadas)"

# ── 2. Obtener DATABASE_URL de Railway ──
echo ""
echo "🔌 [2/3] Obteniendo DATABASE_URL de Railway..."
DB_URL=$(railway variables --json | grep -o '"DATABASE_URL":"[^"]*"' | cut -d'"' -f4)

if [ -z "$DB_URL" ]; then
    echo "❌ ERROR: No se pudo obtener DATABASE_URL"
    echo "   Asegúrate de estar en el directorio del proyecto con Railway CLI configurado."
    exit 1
fi

echo "✅ DATABASE_URL obtenido (oculto por seguridad)"

# ── 3. Backup de la base de datos ──
echo ""
echo "💾 [3/3] Exportando PostgreSQL..."
pg_dump "$DB_URL" --format=custom --file="${BACKUP_DIR}/database.dump"

echo "✅ Base de datos exportada: ${BACKUP_DIR}/database.dump"

# ── 4. Backup de uploads (si es posible) ──
echo ""
echo "📁 [Extra] Para backup de archivos subidos (uploads/):"
echo "   Railway no expone SSH directo. Descarga manual desde:"
echo "   Railway Dashboard → Tu servicio → Data → Volumes"

# ── Resumen ──
echo ""
echo "=========================================="
echo "🎉 BACKUP COMPLETADO"
echo "=========================================="
echo "📂 Ubicación: ${BACKUP_DIR}/"
echo ""
echo "Archivos generados:"
ls -lh "${BACKUP_DIR}/"
echo ""
echo "Para restaurar en otro servidor:"
echo "  pg_restore -d 'postgresql://user:pass@host/db' ${BACKUP_DIR}/database.dump"
echo ""
