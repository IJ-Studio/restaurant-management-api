# Despliegue a producción

> **Ejecutado el 14-nov** (release #157, `develop` → `main`; Render en línea a las 00:20). Abajo, el
> registro y, después, el plan original del 13-nov. Fusionar `develop` → `main` dispara Render.

## Registro del 14-nov

1. Respaldo completo con `pg_dump -Fc` (pooler en modo sesión, puerto 5432), verificado contra los
   conteos de producción. Se guarda fuera del repositorio: contiene datos personales.
2. Migraciones aplicadas una por una con `apply_migration` de Supabase (quedan registradas en
   `supabase_migrations`): `consentimientos_20261113`, `refresh_tokens_20261113`,
   `solicitudes_factura_20261114`. Tras cada una: tabla, RLS y política comprobadas, y la carta en 200.
3. No aplicadas: normalización B, teléfonos E.164, activación del cifrado y `codigos-verificacion`.
4. #135 cerrado (lo sustituyó #150). Release #157 con el CI en verde.
5. Humo sin sesión: carta, `/reglas` (`America/Mexico_City`) y `/sitio` en 200; `sign-in` con
   credenciales erróneas y `refresh` falso en 401; rutas protegidas en 401.
6. Variables que faltan en Render: `THROTTLE_LIMIT` (por defecto 40/min por IP) y `CLOUDINARY_*`
   (ya faltaban antes del release; sin ellas no se pueden subir imágenes).

> Si se usa el `.env` local con `psql`/`pg_dump`, quitar los retornos de carro (`tr -d '\r'`): el
> archivo tiene finales CRLF y el nombre de la base llega como `postgres\r`.

## Plan original (13-nov)

## Estado

- `develop` tiene 13 PRs que no están en `main` (#137–#149): ARCO, refresco de sesión, avisos push,
  SSE de pedidos, reglas de negocio y zona horaria, cola de facturas, importar carta, usuarios
  inactivos, k6 y scripts de datos de prueba.
- `main` tiene el hotfix #136 (aceptar el `usuarioId` de la app 1.0.0 de Play) que `develop` no tenía.
  El PR #135 ya no entra limpio; **#150 lo trae con los conflictos resueltos**. Sin él, desplegar
  `develop` volvería a romper los pedidos de la app publicada.
- Base de producción (consultada con `list_tables`): **faltan** `consentimientos`, `refresh_tokens` y
  `solicitudes_factura`.

## Orden

1. Fusionar #150 en `develop` (y cerrar #135 sin cambios pendientes).
2. Respaldar la base (panel de Supabase → Backups, o `pg_dump -Fc --schema=public`).
3. Aplicar en producción, en este orden (cada una tiene su `.reversa.sql`):
   1. `src/database/sql/2026-11-13-consentimientos.sql`
   2. `src/database/sql/2026-11-13-refresh-tokens.sql`
   3. `src/database/sql/2026-11-14-solicitudes-factura.sql`

   **No aplicar** la migración B, la de teléfonos E.164 ni la activación del cifrado.
4. Variables en Render (las que faltan o cambian):

   | Variable | Valor | Por qué |
   |---|---|---|
   | `THROTTLE_LIMIT` | `300` | Todo el personal sale por la IP del módem (DM-17) |
   | `CORREO_ACTIVO` | sin definir o `false` | Brevo queda preparado pero apagado |
   | `BREVO_API_KEY`, `CORREO_REMITENTE` | solo si se activa el correo | — |
   | `CORS_ORIGINS` | dominios de la web (Vercel) | Revisar que incluya el dominio actual |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | los de Stripe | Cobro con tarjeta (web y app) |

5. PR `develop` → `main` (lo fusiona el usuario; DM-10). Render despliega solo.
6. Comprobación rápida tras el despliegue:
   - `GET /reglas` 200; login web y app; `POST /auth/refresh` devuelve un token nuevo.
   - Crear un pedido de mesa desde la app 1.0.0 de Play (hotfix #136).
   - `GET /profile/privacidad` 200 (tabla `consentimientos`).
   - Admin → Facturas: la bandeja abre (tabla `solicitudes_factura`).
7. Después, la web: `developer` → `main` (Vercel). El PR web #19 necesita el API con #148.
8. Después, el build de la app (EAS) y el envío a Play.

## Si algo falla

- API: en Render, «Rollback» al despliegue anterior.
- Base: aplicar las `.reversa.sql` en orden inverso (solicitudes-factura, refresh-tokens,
  consentimientos). El API anterior no usa esas tablas.

## Pendiente de revisar con el usuario

- `ordenes` aparece con ~9 400 filas estimadas y solo 25 partidas: probablemente datos de prueba
  (pruebas de carga o QA). No se tocó nada; `scripts/bd/limpiar-datos-prueba.sql` sirve para
  separarlos con reversa, revisando antes qué marca cada condición (ver `docs/base-de-datos.md`).
