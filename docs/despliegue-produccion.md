# Despliegue a producción (plan; no ejecutado)

> Diagnóstico de **solo lectura** del 13-nov. Nadie ha desplegado nada. El despliegue lo hace el
> usuario: fusionar `develop` → `main` dispara Render.

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
