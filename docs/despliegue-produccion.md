# Despliegue a producción del API

## Dónde corre

| | Producción |
|---|---|
| Hosting | Render, servicio `API_restaurant_management` (plan gratis, Oregón) |
| URL | `https://api-restaurant-management.onrender.com` |
| Origen | `IJ-Studio/restaurant-management-api`, rama **`main`**, auto-deploy en cada commit |
| Build | `pnpm install --frozen-lockfile; pnpm run build` |
| Arranque | `pnpm run start:prod` (`node dist/src/main.js`), Node 22 |
| Base de datos | Supabase `restaurant_management` (`mdygrtdebtmuhmirnbxz`) |

En el plan gratis el servicio se duerme tras unos 15 minutos sin uso y tarda cerca de un minuto en despertar.

## Variables del servicio (solo nombres)

Obligatorias (el API no arranca sin ellas, `src/common/config/env.validation.ts`): `DATABASE_URL`,
`JWT_SECRET` (al menos 32 caracteres, el mismo que usa la web), `JWT_ACCESS_TOKEN_TTL`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `FACTURAPI_TEST_KEY`.

Además: `NODE_ENV=production`, `TRUST_PROXY=1`, `CORS_ORIGINS=https://el-quijote.vercel.app`, `DATABASE_SSL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BACKUPS_BUCKET`, `PORT`.
Pendientes: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (sin ellas no se suben fotos).
Sin definir a propósito: `CIFRADO_*` (cifrado apagado) y `PREDICCION_NO_SHOW_ACTIVA`.

## Cómo se publica una versión

1. PR de `develop` a `main` con el CI en verde (`lint-test`, `security`, `codeql`, CodeQL).
2. Al fusionar, Render despliega solo. Revisar en Render → *Events/Logs* que diga «Your service is live».
3. Si el despliegue falla, Render deja la versión anterior; para volver atrás a mano: *Events* → versión anterior → *Rollback*.
4. Regresar `main` a `develop` si el PR de release trajo cambios propios.

Las migraciones de `src/database/sql/` se aplican a mano en Supabase, antes del despliegue si son compatibles
con el código anterior y después si dependen del nuevo.

## Historial

### 2026-11-12: develop a producción (PR #134)

- Producción tenía el código de julio y desplegaba desde el repo personal de Irving
  (`irvingaldahirangelesromero/API_restaurant_management`). Se instaló la app de Render en IJ-Studio y el
  servicio pasó a desplegar `IJ-Studio/restaurant-management-api` (`main`), con la misma URL.
- `main` tenía 15 commits de julio fuera de `develop`; se integró su historia conservando el código de `develop`.
- En el PR: deuda de lint, validación de `estatus` y `q` repetidos en `GET /facturas` (CodeQL) y prueba de
  cifrado determinista. La alerta de SHA-1 en la firma de Cloudinary se descartó: Cloudinary exige SHA-1.
- Variables agregadas en Render: `NODE_ENV`, `TRUST_PROXY`, `CORS_ORIGINS`.
- Migraciones: ninguna en este despliegue; todas las estructurales ya estaban aplicadas. Sin aplicar a
  propósito: normalización B (mayúsculas), teléfonos E.164 y activación del cifrado.
- Desplegado `4959366` y en vivo el 2026-11-12 a las 07:05 UTC.
- Pendiente: rotación de `JWT_SECRET` (a la vez en Render y Vercel), variables de Cloudinary, webhook de Stripe
  en modo prueba hacia esta URL y respaldo con `pg_dump` (existe el esquema `respaldo_20261104` en la base).
