# AGENTS.md — misello.gt (YOYO GRAPHICS e-commerce)

> **⚠️ MANDATORIO: Antes de cualquier cambio, leer `docs/SEGURIDAD_PENDIENTES.md`.**
> Ninguna funcionalidad nueva puede romper los controles de seguridad ya implementados.

---

## Descripción General

E-commerce de sellos personalizados para Guatemala. Los clientes diseñan sellos en el navegador, pagan y descargan el SVG. Incluye panel de administración completo (ERP) y app Android nativa para gestión de inventario.

**Dominio de producción:** `misello-gt-production.up.railway.app`  
**Repo:** `github.com/yoyographics/misello-gt`

---

## Arquitectura

| Capa | Tecnología |
|------|------------|
| **Backend** | NestJS 11 + Prisma 6.19.3 |
| **Base de Datos** | PostgreSQL en Railway |
| **Frontend Cliente** | Next.js 14 (App Router), `output: 'export'` (static) |
| **Admin Panel** | Next.js 14 + Tailwind + shadcn/ui |
| **Auth** | Google OAuth (cliente) + Password JWT (admin, 8h expiry) |
| **Hosting** | Railway (single service, node:20-slim) |

---

## Estructura de Archivos

```
misello-gt/
├── AGENTS.md                      # Este archivo
├── docs/
│   ├── SEGURIDAD_PENDIENTES.md    # 🔒 Backlog de seguridad (MANDATORIO leer)
│   ├── ESTRUCTURA_BD.md           # (si existe)
│   └── FASES.md                   # (si existe)
├── backend/                       # NestJS
│   ├── src/
│   │   ├── auth/                  # Google OAuth + Admin JWT
│   │   ├── upload/                # File upload con fileFilter
│   │   ├── filters/               # AllExceptionsFilter (sanitiza errores)
│   │   ├── main.ts                # Helmet, CORS, Rate Limiting, CSP
│   │   └── ...
│   └── ...
├── frontend/                      # Next.js 14 static export
│   ├── src/
│   │   ├── app/
│   │   │   ├── (shop)/            # Rutas públicas: /, /store, /design, /cart, /checkout
│   │   │   │   ├── layout.tsx     # ShopLayout con Header
│   │   │   │   ├── page.tsx       # Homepage (re-exporta home-v2/page.tsx)
│   │   │   │   ├── home-v2/       # Homepage v2
│   │   │   │   ├── store/
│   │   │   │   ├── design/
│   │   │   │   ├── cart/
│   │   │   │   └── checkout/
│   │   │   ├── admin/             # Panel admin protegido con JWT
│   │   │   └── ...
│   │   ├── components/layout/
│   │   │   └── Header.tsx         # Header del shop (links desktop, auth, carrito)
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx        # Auth context (lee token de hash fragment)
│   │   │   └── useCart.tsx        # Carrito con localStorage
│   │   └── lib/
│   │       ├── auth-utils.ts      # redirectToGoogleLogin, handleGoogleCallback
│   │       ├── api.ts             # Axios instance
│   │       └── escapeHtml.ts      # Sanitización XSS
│   └── next.config.js             # output: 'export'
└── ...
```

---

## Reglas de Desarrollo (NO NEGOCIABLES)

### 1. Seguridad primero
- **LEER** `docs/SEGURIDAD_PENDIENTES.md` antes de cualquier cambio.
- **NUNCA** almacenar datos de tarjeta de crédito en nuestra BD.
- **NUNCA** procesar pagos en el frontend.
- **NUNCA** exponer stack traces, secrets, ni tokens en errores de producción.
- **NUNCA** usar `eval()`, `exec()`, ni `dangerouslySetInnerHTML` con input del usuario.

### 2. Mínimos cambios
- Hacer solo lo necesario para cada tarea.
- No reescribir archivos enteros si solo se necesita un fix pequeño.

### 3. Código limpio
- Backend: seguir convenciones NestJS (services, controllers, DTOs con class-validator).
- Frontend: TypeScript estricto, componentes funcionales, hooks personalizados en `src/hooks/`.

### 4. Static export
- Next.js usa `output: 'export'`. **Todas las rutas deben ser estáticas.**
- No usar `useSearchParams()` sin `Suspense` (rompe el static export).
- Rutas dinámicas se manejan con query params: `/store/product?id=xxx` en vez de `/store/[id]`.

### 5. Decisiones arquitectónicas ya tomadas (NO CAMBIAR sin discusión)
- **CSP con `unsafe-inline'`**: Necesario para hidratación de Next.js static export.
- **Admin token en `localStorage`**: Limitación de static export (no hay httpWithout cookies).
- **Google OAuth token en hash fragment (`#token=`)**: Más seguro que query params (no va a server logs).
- **API REST para app Android**: NUNCA conectar la app directamente a PostgreSQL.

### 6. Checklist pre-push
```
- [ ] Validación de DTO en inputs del usuario
- [ ] No hay console.log con datos sensibles
- [ ] Errores sanitizados (no exponen stack traces)
- [ ] Nuevos endpoints sensibles tienen rate limiting
- [ ] Nuevos uploads validan tipo MIME y tamaño
- [ ] Se actualizó SEGURIDAD_PENDIENTES.md si aplica
```

---

## Flujos Clave

### Login con Google (Cliente)
```
1. Usuario clic "Ingresar"
2. redirectToGoogleLogin() → guarda postLoginRedirect en localStorage
3. Redirige a /api/v1/auth/google
4. Backend autentica con Google, genera JWT
5. Redirige a /#token=<jwt>  (hash fragment, no query param)
6. useAuth.tsx lee el hash, guarda en localStorage ('clientToken'), limpia URL
7. Actualiza estado de usuario en el contexto
```

### Login Admin
```
1. POST /api/v1/auth/admin-login con email/password
2. Backend valida con bcrypt, genera JWT (exp: 8h)
3. Frontend guarda en localStorage ('adminToken')
4. AdminLayout verifica token en useEffect
5. Si expirado o no existe → redirige a /admin/login/
```

### Checkout / Pedido
```
1. Cliente diseña sello en /design
2. Agrega al carrito (useCart + localStorage)
3. Va a /cart → revisa items
4. Va a /checkout → completa datos de envío
5. Backend crea Order con estado PENDING (futuro: PENDING_PAYMENT)
6. (Pendiente) Integración con proveedor de pagos
7. (Pendiente) Facturación electrónica SAT
```

---

## Variables de Entorno Importantes

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://...   # Railway PostgreSQL
JWT_SECRET=...                  # Secret para firmar JWTs
FRONTEND_URL=...                # URL del frontend (CORS)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAIL=...                 # Email del superadmin
ADMIN_PASSWORD_HASH=...         # bcrypt hash
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://.../api/v1
```

**Regla**: Solo variables con `NEXT_PUBLIC_` van al frontend. NUNCA poner secrets sin ese prefijo.

---

## Contacto / Contexto Adicional

- Documentación de seguridad: `docs/SEGURIDAD_PENDIENTES.md`
- Si se agrega/modifica un control de seguridad, actualizar AMBOS archivos (`AGENTS.md` y `SEGURIDAD_PENDIENTES.md`).
