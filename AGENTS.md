# AGENTS.md — misello.gt

## Regla de oro del flujo de trabajo

> **Siempre hacer push al terminar.** Nunca dejar cambios a medias. Cuando se trabaja en una funcionalidad, se debe completar tanto el backend como el frontend y luego hacer `git push` a `main` para que Railway despliegue automáticamente.

### Checklist antes de push
1. Cambios funcionales en backend **y** frontend.
2. `npm run build` pasa en `backend/`.
3. `npm run build` pasa en `frontend/`.
4. No hay archivos temporales, logs de build ni variables de entorno locales en el commit.
5. Hacer `git push` a `main`.

## Contexto técnico

- **Backend:** NestJS 11 + Prisma 6.19.3 + PostgreSQL (Railway).
- **Frontend:** Next.js 14 App Router + Tailwind + shadcn/ui, export estático.
- **Deploy:** Railway auto-deploy desde GitHub `main`.
- **Autenticación:** Google OAuth (cliente JWT 30d) + Password JWT (admin 8h).

## Notas importantes

- Las plantillas SVG editables se marcan manualmente en `/admin/templates` haciendo clic sobre los textos del preview.
- Los textos convertidos a `<path>` (outlines) no son editables; deben re-exportarse desde Illustrator como texto real.
- El kerning circular es una aproximación visual; la fábrica recibe el SVG con la fuente indicada.
