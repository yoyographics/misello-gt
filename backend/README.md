# misello.gt — Backend

Backend de la plataforma misello.gt, desarrollado con **NestJS** + **PostgreSQL** + **Prisma**.

## Requisitos previos

- Node.js 20 LTS (o superior)
- PostgreSQL 16 (local o via Docker)
- Cuenta en GitHub
- Cuenta en Railway (para deploy de pruebas)

## Estructura del proyecto

```
backend/
├── prisma/
│   └── schema.prisma      # Esquema de base de datos
├── src/
│   ├── auth/              # Módulo 1 — Autenticación
│   ├── catalog/           # Módulo 2 — Catálogo
│   ├── design/            # Módulo 3 — Asistente de diseño
│   ├── orders/            # Módulo 4 — Órdenes
│   ├── payments/          # Módulo 5 — Pagos y facturación
│   ├── inventory/         # Módulo 6 — Inventario
│   ├── notifications/     # Módulo 7 — Notificaciones
│   ├── admin/             # Módulo 8 — Panel de control
│   └── main.ts            # Punto de entrada
├── uploads/               # Archivos subidos (fuentes, logos, diseños, etc.)
├── .env.example           # Ejemplo de variables de entorno
├── docker-compose.yml     # PostgreSQL + backend local
├── Dockerfile             # Imagen para producción
├── railway.toml           # Configuración de deploy en Railway
└── package.json
```

## Instalación local (paso a paso)

### 1. Clonar el repositorio

```bash
git clone https://github.com/yoyographics/misello-gt.git
cd misello-gt/backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá el archivo `.env` y completá los valores reales (Google OAuth, JWT, APIs externas, etc.).

### 4. Levantar PostgreSQL con Docker Compose

```bash
docker-compose up -d postgres
```

Esto crea un contenedor de PostgreSQL 16 con:
- Usuario: `misello_user`
- Contraseña: `misello_password`
- Base de datos: `misello_db`
- Puerto: `5432`

### 5. Ejecutar migraciones de Prisma

```bash
npx prisma migrate dev --name init
```

### 6. Generar el cliente de Prisma

```bash
npx prisma generate
```

### 7. Cargar datos iniciales del catálogo (seed)

```bash
npx prisma db seed
```

### 8. Iniciar el servidor en modo desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en: `http://localhost:3000/api/v1`

La documentación Swagger estará en: `http://localhost:3000/api/docs`

---

## Deploy en Railway

### 1. Conectar el repositorio

1. Andá a [railway.app](https://railway.app) y creá un nuevo proyecto.
2. Seleccioná **"Deploy from GitHub repo"**.
3. Elegí el repositorio `yoyographics/misello-gt`.

### 2. Agregar PostgreSQL

En el panel de Railway, hacé clic en **"New" → "Database" → "Add PostgreSQL"**.

Railway genera automáticamente la variable `DATABASE_URL`.

### 3. Configurar variables de entorno

En la sección **Variables** del servicio backend, agregá todas las variables del archivo `.env.example`:

| Variable | Descripción |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth |
| `GOOGLE_CALLBACK_URL` | URL de callback de Google (ej: `https://tu-app.up.railway.app/api/v1/auth/google/callback`) |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |
| `ANTHROPIC_API_KEY` | API Key de Claude (Anthropic) |
| `PAGALO_API_KEY` | API Key de Pagalo.gt |
| `PAGALO_BUSINESS_UUID` | UUID del negocio en Pagalo.gt |
| `TEKRA_USUARIO`, `TEKRA_CLAVE`, `TEKRA_CLIENTE`, `TEKRA_CONTRATO` | Credenciales de Tekra S.A. |
| `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` | Servidor SMTP para emails |
| `FRONTEND_URL` | URL del frontend (para CORS) |

### 4. Deploy automático

Cada vez que hacés `git push` a la rama `main`, Railway reconstruye y despliega automáticamente.

### 5. Crear el primer administrador

Una vez desplegado, ejecutá el script de creación de admin (desde tu máquina local conectada a la BD de Railway, o desde el panel de Railway):

```bash
npx ts-node src/scripts/create-admin.ts
```

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Inicia en modo desarrollo con hot-reload |
| `npm run build` | Compila el proyecto para producción |
| `npm run start:prod` | Inicia el servidor compilado |
| `npm run test` | Ejecuta los tests unitarios |
| `npm run lint` | Ejecuta el linter |
| `npx prisma migrate dev` | Crea y aplica migraciones en desarrollo |
| `npx prisma migrate deploy` | Aplica migraciones en producción |
| `npx prisma db seed` | Carga datos iniciales del catálogo |
| `npx prisma studio` | Abre Prisma Studio (interfaz visual de la BD) |
| `npx prisma validate` | Valida que el schema.prisma sea correcto |

---

## Seguridad

- Nunca commitear el archivo `.env` (ya está en `.gitignore`).
- Las contraseñas de panel se hashean con bcrypt.
- Los tokens JWT nunca se almacenan en la base de datos.
- Todos los endpoints públicos tienen rate limiting.
- Los datos de tarjeta (CVV, número completo) nunca se guardan.

---

**Powered by YOYO GRAPHICS — misello.gt**
