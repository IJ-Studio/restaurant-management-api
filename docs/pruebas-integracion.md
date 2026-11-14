# Pruebas de integración: menú, reservaciones, push y estadísticas

Suites contra el API real y su base (app ↔ API ↔ BD ↔ Expo simulado). Corren en cada PR con
`integration-tests.yml` y en local con `pnpm test:integracion`. Las de caja, pagos y facturas, que
necesitan Stripe y Facturapi de prueba, están en [`pruebas-pagos-facturacion.md`](pruebas-pagos-facturacion.md).

| Suite | Tareas | Qué prueba |
|---|---|---|
| `src/integracion/menu-reservaciones.int-spec.ts` | api#79, api#71 | El menú sale de la base y agrupado por categoría; una reservación válida se guarda y aparece en el listado del personal; 11 payloads inválidos o maliciosos se rechazan con 400 sin guardar nada; la inyección SQL se guarda como texto |
| `src/integracion/push-estadisticas.int-spec.ts` | api#83 | El token del teléfono se registra, se reasigna y se da de baja; al marcar «lista» Expo recibe el aviso para el mesero y al entregar para caja, sin datos del cliente; las estadísticas suben con el pedido y el pago de la prueba; solo el admin las ve |

## En CI

`integration-tests.yml` levanta PostgreSQL 17 con [`test/db/`](../test/db):

- `preparar.sql`: deja la base vacía, con las extensiones y los roles que nombran las políticas.
- `esquema.sql`: la estructura, sin datos.
- `semilla.sql`: datos sintéticos. Los usuarios son `<rol>@prueba.local`.

Después arranca el API compilado contra esa base, con un `JWT_SECRET` y una contraseña de prueba
que se generan en cada corrida, y `EXPO_PUSH_URL` apuntando al Expo simulado de la suite. Esa variable
solo se respeta fuera de producción. La evidencia queda en el Summary (la lista de escenarios) y en
el artefacto `integration-tests-report`, que incluye el log del API.

## En local

```bash
createdb quijote_local
psql -v ON_ERROR_STOP=1 -d quijote_local -f test/db/preparar.sql
psql -v ON_ERROR_STOP=1 -d quijote_local -f test/db/esquema.sql
psql -v ON_ERROR_STOP=1 -v clave_pruebas='<la que elijas>' -d quijote_local -f test/db/semilla.sql
```

Arranca el API contra esa base (nunca con el `.env` de producción), agregando
`EXPO_PUSH_URL=http://127.0.0.1:10099/push`, y luego:

```bash
API_URL=http://localhost:10000 LOCAL_DATABASE_URL=postgresql://…@localhost/quijote_local \
CLAVE_PRUEBAS='<la misma>' EXPO_PUSH_URL=http://127.0.0.1:10099/push pnpm test:integracion
```

Las suites se niegan a correr si `API_URL` o `LOCAL_DATABASE_URL` no son de localhost. Se pueden repetir
sin limpiar la base: al terminar cobran los pedidos que abrieron y borran sus reservaciones, platillos y
tokens.
