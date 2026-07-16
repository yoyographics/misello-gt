#!/bin/bash
# ============================================================
# SCRIPT MAESTRO: Instalación de misello.gt en servidor local
# ============================================================
# Este script automatiza TODO el proceso de instalación.
# 
# USO:
#   1. Guarda este archivo como install-misello.sh en tu servidor Linux
#   2. chmod +x install-misello.sh
#   3. ./install-misello.sh
#
# El script te preguntará los valores de las variables de Railway.
# ============================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     INSTALACIÓN DE misello.gt EN SERVIDOR LOCAL            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================
# 1. VERIFICAR REQUISITOS
# ============================================================
echo "🔍 [1/6] Verificando requisitos..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado."
    echo "   Instálalo con: sudo apt update && sudo apt install docker.io docker-compose-plugin -y"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado."
    echo "   Instálalo con: sudo apt install git -y"
    exit 1
fi

echo "   ✅ Docker y Git están instalados"

# ============================================================
# 2. PREGUNTAR VARIABLES DE RAILWAY (INTERACTIVO)
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  CONFIGURACIÓN DE VARIABLES (copia desde Railway Dashboard)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Si no tienes algún valor, solo presiona ENTER para dejarlo vacío."
echo "Las variables vacías se pueden configurar después en backend/.env"
echo ""

read -p "Cloudinary Cloud Name (ej: dmwkxptn): " CLOUDINARY_CLOUD_NAME
read -p "Cloudinary API Key (ej: 221697271224343): " CLOUDINARY_API_KEY
read -s -p "Cloudinary API Secret: " CLOUDINARY_API_SECRET
echo ""
read -p "JWT Secret (deja en blanco para generar uno nuevo): " JWT_SECRET_INPUT
read -p "Google Client ID (deja en blanco si no usas OAuth): " GOOGLE_CLIENT_ID
read -s -p "Google Client Secret (deja en blanco si no usas OAuth): " GOOGLE_CLIENT_SECRET
echo ""

# Si no se ingresó JWT_SECRET, generar uno nuevo
if [ -z "$JWT_SECRET_INPUT" ]; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo "   🔑 JWT Secret generado automáticamente"
else
    JWT_SECRET="$JWT_SECRET_INPUT"
fi

# Detectar IP del servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESUMEN DE CONFIGURACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Servidor IP: $SERVER_IP"
echo "   Frontend:    http://$SERVER_IP:3001"
echo "   Backend:     http://$SERVER_IP:3000"
echo ""

# ============================================================
# 3. CLONAR REPOSITORIO
# ============================================================
echo ""
echo "🐙 [2/6] Clonando repositorio desde GitHub..."

INSTALL_DIR="$HOME/misello-gt"
if [ -d "$INSTALL_DIR" ]; then
    echo "   ⚠️  La carpeta $INSTALL_DIR ya existe"
    read -p "   ¿Sobrescribir? (s/N): " overwrite
    if [[ "$overwrite" =~ ^[Ss]$ ]]; then
        rm -rf "$INSTALL_DIR"
    else
        echo "   Cancelado."
        exit 1
    fi
fi

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
git clone https://github.com/yoyographics/misello-gt.git .

echo "   ✅ Repositorio clonado"

# ============================================================
# 4. CREAR .env DEL BACKEND
# ============================================================
echo ""
echo "⚙️  [3/6] Creando archivo de configuración backend/.env..."

cat > backend/.env << EOF
# ============================================================
# misello.gt - Variables de Entorno (Local)
# ============================================================

# Base de datos (PostgreSQL local en Docker)
DATABASE_URL=postgresql://postgres:misello_local_2024_seguro@postgres:5432/misello_db

# JWT (panel de administración)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=7d

# Google OAuth (opcional - dejar vacío si no se usa)
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://$SERVER_IP:3000/api/v1/auth/google/callback

# Cloudinary (imágenes)
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET

# Pagalo.gt (pagos - sandbox para local)
PAGALO_API_URL=https://apitest.pagalo.co/v1
PAGALO_API_KEY=
PAGALO_BUSINESS_UUID=

# Facturación electrónica Tekra (sandbox)
TEKRA_API_URL=https://apicertificacion.desa.tekra.com.gt
TEKRA_USUARIO=
TEKRA_CLAVE=
TEKRA_CLIENTE=
TEKRA_CONTRATO=
TEKRA_SEGUIMIENTO_URL=https://apiseguimiento.tekra.com.gt

# ReCaptcha (opcional)
RECAPTCHA_SECRET_KEY=

# Claude AI (opcional)
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-6

# Correo electrónico (opcional)
MAIL_HOST=
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=noreply@misello.gt

# Entorno
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://$SERVER_IP:3001
EOF

echo "   ✅ backend/.env creado"

# ============================================================
# 5. CREAR .env.local DEL FRONTEND
# ============================================================
echo ""
echo "⚙️  [4/6] Configurando frontend..."

cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://$SERVER_IP:3000/api/v1
EOF

echo "   ✅ frontend/.env.local creado"

# ============================================================
# 6. LEVANTAR CONTENEDORES
# ============================================================
echo ""
echo "🚀 [5/6] Construyendo e iniciando contenedores Docker..."
echo "   (Este proceso puede tardar 5-10 minutos la primera vez)"
echo ""

docker compose up -d --build

# Esperar a que PostgreSQL esté listo
echo ""
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 10

# Verificar estado
if docker compose ps | grep -q "Up"; then
    echo "   ✅ Contenedores iniciados correctamente"
else
    echo "   ⚠️  Verificando estado..."
    docker compose ps
fi

# ============================================================
# 7. RESUMEN FINAL
# ============================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              ✅ INSTALACIÓN COMPLETADA                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 ACCESO A LA APLICACIÓN:"
echo ""
echo "   🌐 Frontend (sitio web):"
echo "      http://$SERVER_IP:3001"
echo ""
echo "   🔌 Backend API:"
echo "      http://$SERVER_IP:3000"
echo ""
echo "   🐘 PostgreSQL (desde fuera del servidor):"
echo "      Host:     $SERVER_IP"
echo "      Port:     5432"
echo "      User:     postgres"
echo "      Password: misello_local_2024_seguro"
echo "      Database: misello_db"
echo ""
echo "📁 Ubicación del proyecto:"
echo "   $INSTALL_DIR"
echo ""
echo "🔧 COMANDOS ÚTILES:"
echo ""
echo "   Ver logs:        docker compose logs -f"
echo "   Ver estado:      docker compose ps"
echo "   Reiniciar todo:  docker compose restart"
echo "   Detener:         docker compose down"
echo "   Detener + borrar BD:  docker compose down -v"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - La base de datos está VACÍA."
echo "   - Ve a http://$SERVER_IP:3001/admin/setup para crear el primer admin"
echo "   - O ejecuta: docker exec -it misello-backend npx prisma studio"
echo ""
echo "📝 Para editar variables después:"
echo "   nano $INSTALL_DIR/backend/.env"
echo "   docker compose restart backend"
echo ""
