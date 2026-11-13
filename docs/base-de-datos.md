# Base de datos (Fase 5)

## ¿Proyecto nuevo de Supabase o el actual?

**Decisión: seguir con el proyecto actual** (Postgres 17, plan gratuito) y Drizzle.

| Opción | A favor | En contra |
|---|---|---|
| Proyecto actual | Ya tiene los datos reales, RLS (`acceptance_roles_backend`), las migraciones aplicadas y las variables de Render/Vercel apuntando a él | Mezcla datos de prueba con los reales (se resuelve abajo) |
| Proyecto nuevo | Esquema limpio desde Drizzle | Hay que migrar datos y secretos y cambiar URLs en Render, Vercel y EAS a días de la entrega; el plan gratuito permite 2 proyectos activos y pausa los inactivos a la semana; las políticas RLS y funciones que no están en Drizzle se perderían |

Drizzle funciona igual en los dos; el riesgo de mudarse no compensa. Se reevalúa después de la entrega
(26-nov) si el volumen o el plan lo piden.

## Datos de prueba

Marcadores: cuentas con correo `@prueba.local` y mesas de carga `P01…P40` (las usa `perf/`).

```bash
# Separar (archiva en el esquema `pruebas` y borra los pedidos; desactiva cuentas y mesas):
psql "$URL" -v ON_ERROR_STOP=1 -v lote=20261113-1700 -f scripts/bd/limpiar-datos-prueba.sql
# Reversa exacta del mismo lote:
psql "$URL" -v ON_ERROR_STOP=1 -v lote=20261113-1700 -f scripts/bd/revertir-datos-prueba.sql
```

- Los pedidos de prueba y lo que cuelga de ellos (partidas, pagos, facturas, solicitudes de factura y el
  pedido actual de la mesa) se guardan completos en `pruebas.archivo` (JSON por fila) y se borran de
  `public`. Las cuentas y mesas de prueba solo se desactivan.
- `pruebas.archivo` tiene RLS activo sin políticas: el API no lo ve.
- Probado en la base local (13-nov): 9 787 pedidos, 19 649 partidas y 9 783 pagos archivados; tras la
  reversa, los mismos conteos y el mismo hash MD5 de todos los pedidos.
- **Producción:** no aplicado. Antes, revisar con `select` qué marca cada condición (puede haber otros
  datos de prueba con otros correos) y respaldar. Ejecutarlo solo con autorización del usuario.
