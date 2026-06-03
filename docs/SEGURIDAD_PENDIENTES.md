# 🔒 Backlog de Seguridad — misello.gt

> **Documento vivo.** Toda nueva funcionalidad debe pasar la checklist de este archivo antes de merge.
> Última actualización: 2026-06-03

---

## 🟢 Estado Actual — Lo que YA está implementado

| # | Control | Archivo(s) clave | Estado |
|---|---------|------------------|--------|
| 1 | **SQL Injection** — Prisma ORM + prepared statements en todo el backend | `backend/src/**/*.service.ts` | ✅ Activo |
| 2 | **XSS reflejado** — `escapeHtml()` en diálogos, SVG via `<img>`, validación de URLs | `frontend/src/lib/escapeHtml.ts`, `design/page.tsx` | ✅ Activo |
| 3 | **XSS almacenado** — Sanitización de emails, `fileFilter` en uploads, validación estricta de inputs | `backend/src/**/*.dto.ts`, `backend/src/upload/*` | ✅ Activo |
| 4 | **CSRF** — Tokens CSRF en rutas web + `SameSite` cookies | `backend/src/main.ts` (Helmet) | ✅ Activo |
| 5 | **IDOR / manipulación** — `orderBy` whitelist, validación de parámetros | `backend/src/common/pipes/order-by.whitelist.ts` | ✅ Activo |
| 6 | **Exposición de datos sensibles** — Errores sanitizados en producción | `backend/src/filters/all-exceptions.filter.ts` | ✅ Activo |
| 7 | **OAuth token en hash fragment** — JWT de cliente en `#token=` (no va a logs ni referrer) | `backend/src/auth/auth.controller.ts`, `frontend/src/hooks/useAuth.tsx` | ✅ Activo |
| 8 | **Admin JWT con expiración** — Token de 8h en `localStorage` | `backend/src/auth/admin-auth.service.ts` | ✅ Activo |
| 9 | **Webhook verificado** — Secret compartido en headers | `backend/src/webhooks/*` | ✅ Activo |
| 10 | **Headers de seguridad** — Helmet con CSP, HSTS, X-Frame-Options | `backend/src/main.ts` | ✅ Activo |
| 11 | **Rate limiting** — En login y API | `backend/src/main.ts` (Throttler) | ✅ Activo |
| 12 | **HTTPS obligatorio** — Redirect HTTP→HTTPS en producción | `backend/src/main.ts` | ✅ Activo |
| 13 | **CORS estricto** — No permite `*`, solo dominios configurados | `backend/src/main.ts` | ✅ Activo |
| 14 | **Upload de archivos controlado** — `fileFilter`, límites de tamaño, tipos permitidos | `backend/src/upload/*` | ✅ Activo |
| 15 | **Contraseñas hasheadas** — bcrypt en admin y empleados | `backend/src/auth/*` | ✅ Activo |

---

## 🔴 Pendientes CRÍTICOS — Antes de Pagos en Línea

> **NINGÚN sistema de pago puede ir a producción sin estos items completados.**

### P1. Tokenización de tarjetas (NO tocar datos crudos)
- [ ] **Integrar con proveedor de pagos que soporte tokenización** (Stripe, Wompi, etc.)
- [ ] **NUNCA almacenar números de tarjeta** en nuestra base de datos
- [ ] **NUNCA procesar datos de tarjeta en nuestros servidores** — siempre iframe/token del proveedor
- [ ] **Guardar solo los últimos 4 dígitos** (para mostrar al cliente) y el `payment_method_id` del proveedor
- [ ] **Webhook de confirmación de pago** verificado con secret (ya tenemos el patrón, replicar)

### P2. Transacciones atómicas (Pedido + Pago)
- [ ] Wrap de creación de pedido + registro de pago en **Prisma transaction**
- [ ] Rollback automático si el pago falla después de crear el pedido
- [ ] Estado `PENDING_PAYMENT` para pedidos no confirmados
- [ ] Timeout de expiración para pedidos no pagados (ej: 30 min)

### P3. Idempotencia en pagos
- [ ] Generar `idempotency_key` por intento de pago
- [ ] Rechazar pagos duplicados con el mismo `idempotency_key`
- [ ] Evitar cobros dobles si el usuario da doble clic o hay retry de red

### P4. Validación de montos
- [ ] **Recalcular el total del pedido en el backend** — NUNCA confiar en el `amount` que envíe el frontend
- [ ] Validar que precios de productos no hayan cambiado entre "agregar al carrito" y "pagar"
- [ ] Verificar stock disponible nuevamente antes de confirmar el pago

### P5. Protección contra fraudes (básica)
- [ ] Rate limiting específico para endpoint de creación de pagos (más estricto que el general)
- [ ] Validar que la IP del cliente coincida en checkout y callback del proveedor
- [ ] Bloquear pedidos con direcciones de correo descartables (tempmail, etc.)
- [ ] Log de intentos de pago fallidos por IP/email

### P6. Auditoría de pagos
- [ ] Tabla `PaymentAuditLog` con TODOS los eventos: `INITIATED`, `PROCESSING`, `SUCCESS`, `FAILED`, `REFUNDED`
- [ ] Campos obligatorios: `orderId`, `amount`, `currency`, `provider`, `status`, `ipAddress`, `userAgent`, `timestamp`
- [ ] **Inmutable** — una vez creado, ningún campo puede modificarse (solo inserts)

---

## 🟡 Pendientes IMPORTANTES — Facturación Electrónica GT

### F1. Certificado digital (SAT Guatemala)
- [ ] Almacenar certificado `.pfx` del SAT de forma segura (NO en repo, NO en `.env`)
- [ ] Usar **Railway secrets** o **AWS Secrets Manager** para el certificado
- [ ] Rotación de certificados programada (expiran cada 1-2 años)
- [ ] Backup del certificado en almacenamiento cifrado offline

### F2. Firmado XML con sello digital
- [ ] Librería de firma XML validada por el SAT (`xml-crypto` o `node-forge`)
- [ ] Validar estructura del XML antes de firmar (schema XSD del SAT)
- [ ] Nunca exponer la llave privada del certificado en logs ni errores

### F3. Almacenamiento de facturas
- [ ] Guardar PDF + XML de cada factura en storage seguro (S3/Railway volumes con encriptación)
- [ ] Acceso a facturas solo para el dueño del pedido y admins autorizados
- [ ] Retención mínima de 7 años (obligación fiscal GT)

### F4. API del SAT
- [ ] Manejo de errores del web service del SAT sin exponer stack traces
- [ ] Retry con backoff exponencial si el SAT no responde
- [ ] Cola de facturas pendientes si el servicio del SAT cae

---

## 🟠 Pendientes GENERALES — Mejoras de seguridad

### G1. CSP sin `unsafe-inline`
- [ ] **META**: Eliminar `'unsafe-inline'` de `scriptSrc` y `styleSrc` del CSP
- [ ] Requiere migrar de Next.js static export (`output: 'export'`) a SSR o ISR
- [ ] Generar nonces dinámicos para scripts inline de Next.js
- [ ] Mover estilos inline a archivos CSS externos

### G2. Cookies httpOnly para sesiones
- [ ] Migrar admin token de `localStorage` a **cookie `httpOnly; Secure; SameSite=Strict`**
- [ ] Requiere cambiar la arquitectura del admin a SSR con sesiones de servidor
- [ ] Client token (Google OAuth) puede seguir en `localStorage` con expiración corta

### G3. Protección contra bots
- [ ] Agregar **reCAPTCHA v3** o **hCaptcha** en: login, registro, checkout, contacto
- [ ] No en cada clic, solo en acciones de alto riesgo

### G4. WAF / CDN
- [ ] Configurar **Cloudflare** (gratis) frente al dominio
- [ ] Activar: DDoS protection, Bot Fight Mode, OWASP rules básicas
- [ ] Ocultar IP real del servidor Railway

### G5. Monitoreo de seguridad
- [ ] **Sentry** para errores con alertas en tiempo real
- [ ] **Dependabot** o **Snyk** para alertas automáticas de CVEs en dependencias
- [ ] Log de accesos sospechosos (múltiples 401/403 desde misma IP)

### G6. Backup y recuperación
- [ ] Backups automatizados diarios de PostgreSQL en Railway
- [ ] Test de restauración de backup cada 3 meses
- [ ] Backup cifrado en storage separado (no en la misma cuenta Railway)

### G7. Penetration testing
- [ ] Escaneo con **OWASP ZAP** antes de lanzar pagos
- [ ] Escaneo con **Burp Suite Community** en endpoints críticos
- [ ] Revisión manual del flujo de checkout buscando race conditions

### G8. Limpieza de datos
- [ ] Borrar datos personales de clientes que lo soliciten (derecho al olvido)
- [ ] Programar eliminación de carritos abandonados después de 90 días
- [ ] Anonimizar datos de pedidos antiguos (> 2 años) para analytics

---

## ⚠️ Decisiones Arquitectónicas de Seguridad — NO CAMBIAR

Estas decisiones fueron tomadas conscientemente con trade-offs de seguridad. **Cualquier agente o desarrollador que las modifique debe justificarlo y actualizar este documento.**

### D1. CSP con `unsafe-inline`
- **Por qué**: Next.js static export (`output: 'export'`) inyecta scripts inline para hidratación. Sin `unsafe-inline`, React nunca se activa y las páginas quedan congeladas.
- **Trade-off**: Relajamos CSP pero mitigamos XSS con escapeHtml, validación de inputs, y sanitización de emails.
- **Cuándo se puede cambiar**: Cuando migremos de static export a SSR/ISR.

### D2. Admin token en localStorage
- **Por qué**: Static export no permite cookies httpOnly sin SSR.
- **Trade-off**: Vulnerable a XSS si alguien inyecta código (mitigado por escapeHtml y CSP parcial).
- **Cuándo se puede cambiar**: Cuando migremos el admin a SSR con sesiones de servidor.

### D3. Google OAuth token en hash fragment
- **Por qué**: El hash fragment no se envía al servidor en el request HTTP, evitando que el token quede en logs del servidor, referrers, ni historial de navegación del servidor.
- **Trade-off**: El token sigue visible en la barra del navegador hasta que el frontend lo lee y limpia (ya implementado en `useAuth.tsx`).
- **NO cambiar** a query params (`?token=`) sin discutir primero.

### D4. Rutas de producto con query params
- **Por qué**: Next.js static export no soporta rutas dinámicas como `/store/[id]`. Usamos `/store/product?id=xxx`.
- **Trade-off**: URLs menos limpias, pero totalmente estáticas y seguras (no hay SSR que explotar).
- **Cuándo se puede cambiar**: Cuando migremos a SSR/ISR.

### D5. API REST para app Android (no MySQL directo)
- **Por qué**: La app Android NUNCA debe conectarse directamente a MySQL/PostgreSQL.
- **Trade-off**: Más trabajo de desarrollo, pero previene exposición total de la BD.
- **NO cambiar** — si alguien propone conexión directa a BD, rechazar.

---

## ✅ Checklist — Antes de mergear cualquier PR nuevo

Todo agente/desenvolupador debe verificar esto antes de hacer push:

```markdown
- [ ] No hay `console.log` con datos sensibles (tokens, emails, contraseñas, números de tarjeta)
- [ ] No hay `eval()`, `exec()`, ni `Function()` con input del usuario
- [ ] Todos los inputs del usuario tienen validación de DTO/class-validator
- [ ] Ninguna query raw de SQL sin parametrización
- [ ] Ningún `innerHTML` o `dangerouslySetInnerHTML` con input del usuario
- [ ] No se exponen secrets en el frontend (`.env` con `NEXT_PUBLIC_` solo para URLs públicas)
- [ ] Los errores no exponen stack traces en producción
- [ ] Nuevos endpoints tienen rate limiting si son sensibles
- [ ] Nuevos uploads validan tipo MIME y tamaño máximo
- [ ] Se actualizó este documento si se agregó/modificó un control de seguridad
```

---

## 📅 Plan de implementación sugerido

| Fase | Fecha objetivo | Tareas |
|------|---------------|--------|
| **Fase 1 — Pre-pagos** | ASAP | P1.1 a P1.6 (tokenización, transacciones, idempotencia, validación de montos, auditoría) |
| **Fase 2 — Pagos** | Después de Fase 1 | Integración con proveedor de pagos, webhooks, testing de edge cases |
| **Fase 3 — Pre-facturación** | Después de Fase 2 | F1 a F4 (certificado SAT, firma XML, storage de facturas) |
| **Fase 4 — Post-lanzamiento** | Continuo | G1 a G8 (CSP hardening, cookies httpOnly, WAF, monitoreo, backups, pentest) |

---

## 🔗 Referencias

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [PCI-DSS SAQ-A](https://www.pcisecuritystandards.org/document_library?category=saqs) (para e-commerce con iframe de pago)
- [SAT Guatemala — Facturación Electrónica](http://www.sat.gob.gt/portal/?id=6804)
- Archivo de contexto del proyecto: `AGENTS.md` (reglas de desarrollo y arquitectura)
