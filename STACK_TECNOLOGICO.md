# Stack Tecnologico - misello.gt

## Lenguajes
- TypeScript (Backend + Frontend)
- SQL (via Prisma)
- CSS / Tailwind CSS

================================================================================

## BACKEND (/backend/)

### Runtime & Framework
- Node.js 20
- NestJS 11.0.1
- TypeScript 5.7.3

### Base de Datos
- PostgreSQL 16
- Prisma 6.6.0 (ORM + Migraciones + Cliente)

### Autenticacion
- Passport.js 0.7.0
- @nestjs/jwt 11.0.2 (Tokens JWT)
- passport-google-oauth20 2.0.0 (Google OAuth 2.0)
- bcrypt 6.0.0 (Hash de contrasenas)

### Seguridad
- @nestjs/throttler 6.5.0 (Rate limiting)
- helmet 8.1.0 (HTTP security headers)
- class-validator 0.15.1 + class-transformer 0.5.1 (Validacion DTOs)

### APIs & HTTP
- @nestjs/swagger 11.4.2 (OpenAPI / Swagger docs)
- axios 1.16.0 (HTTP client)
- soap 1.9.1 (Web services - facturacion electronica GT)

### IA & Diseno
- @anthropic-ai/sdk 0.94.0 (Claude AI - generacion de disenos)
- opentype.js 2.0.0 (Texto a paths SVG + metadata de fuentes)

### Email
- @nestjs-modules/mailer 2.3.4
- nodemailer 8.0.7

### Testing & Calidad
- Jest 30.0.0
- ts-jest 29.2.5
- supertest 7.0.0
- ESLint 9 + Prettier 3.4.2

### Modulos NestJS
- admin        -> Panel admin (dashboard, metricas)
- auth         -> Login/logout, Google OAuth, JWT
- client       -> Rutas publicas (productos, fonts, inks)
- design       -> Generacion SVG, validacion tecnica, Claude AI
- fonts        -> CRUD fuentes + upload base64 + serving
- inks         -> CRUD tintas
- inventory    -> Gestion de inventario
- notifications-> Notificaciones por email
- orders       -> Pedidos y estados
- payments     -> Pagos
- prisma       -> Cliente Prisma + servicio DB
- products     -> Catalogo de productos

================================================================================

## FRONTEND (/frontend/)

### Framework & UI
- Next.js 14.2.35 (App Router)
- React 18
- TypeScript 5

### Estilos
- Tailwind CSS 3.4.1
- tailwindcss-animate 1.0.7
- shadcn/ui 4.7.0
- @base-ui/react 1.4.1 (primitives)
- clsx 2.1.1 + tailwind-merge 3.6.0

### Iconos
- lucide-react 1.14.0

### HTTP Client
- axios 1.16.0

### Componentes shadcn/ui usados
- avatar
- badge
- button
- card
- checkbox
- dialog
- input
- select
- separator
- sheet
- tabs

### Configuracion especial Next.js
- output: 'export'         -> Static site generation
- trailingSlash: true
- images.unoptimized: true -> Requerido para static export

================================================================================

## INFRAESTRUCTURA & DEVOPS

- Docker                -> Contenerizacion
- Docker Compose        -> Orquestacion local
- Nginx                 -> Reverse proxy / load balancer
- Railway               -> Hosting en produccion (deploy auto desde GitHub)

================================================================================

## BASE DE DATOS (PostgreSQL + Prisma)

### Tablas principales
- User
- Admin
- Product
- Order
- OrderItem
- Font
- Ink
- InventoryLog
- Discount
- WaitlistEntry
- Payment
- Notification
- ActivityLog

### Enums clave
- ProductCategory:
  - MONTURA_AUTOMATICA
  - FECHADOR
  - PORTATIL
  - MADERA
  - EMBOSADORA
  - ALMOHADILLA_AUTOMATICA
  - ALMOHADILLA_MADERA
  - TINTA

- ProductShape:
  - RECTANGULAR
  - CIRCULAR
  - OVAL

- OrderStatus:
  - DRAFT
  - PENDING_PAYMENT
  - PAYMENT_RECEIVED
  - CONFIRMED
  - IN_PRODUCTION
  - FINISHED
  - SHIPPED

- AdminRole:
  - ADMIN
  - CONTABILIDAD
  - IT
  - RECEPCION
  - DISENO
  - PRODUCCION

================================================================================

## FLUJO DE DOCKER (docker-compose.yml)

1. postgres:16-alpine     -> Base de datos
2. backend (NestJS)       -> API en puerto 3000
3. frontend (Next.js)     -> Static export en puerto 3001
4. nginx:alpine           -> Reverse proxy en puerto 80

================================================================================

## NOTAS

- App Android nativa en Kotlin: DOCUMENTADA en AGENTS.md pero NO presente
  en este repositorio. El repo actual solo contiene backend + frontend web.

- El deploy en Railway usa un Dockerfile multi-etapa que:
  1. Builda el frontend Next.js (static export -> /out)
  2. Builda el backend NestJS
  3. Copia /out del frontend a /public del backend
  4. Corre migraciones Prisma al iniciar

- Fonts se sirven desde la base de datos (base64) via endpoint
  GET /fonts/:id/file con Cache-Control: public, max-age=86400
