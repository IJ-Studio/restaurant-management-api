# Pruebas de rendimiento y esfuerzo (k6)

Scripts en `perf/`; workflow manual `.github/workflows/perf.yml` (solo contra un entorno de pruebas, nunca
producción). Issues: api#80 (línea base S2), api#82 (pedidos y cobro en hora pico, S3), api#84
(estadísticas, S4) y api#85 (esfuerzo, S4).

## Cómo se ejecutan

```bash
# API de pruebas con el límite por IP alto: todas las peticiones salen de una sola máquina.
THROTTLE_LIMIT=100000 <arrancar el API contra la base de pruebas>

k6 run perf/load.js                         # los tres escenarios, 20 usuarios virtuales, 5 min
k6 run -e SCENARIO=s3 -e DURATION=1m perf/load.js
k6 run -e FACTOR=0.5 perf/stress.js         # rampa y pico a la mitad de duración
```

Variables: `BASE_URL` (por defecto `http://localhost:10000`), `PASSWORD`, `USER_DOMAIN`, `MESAS`.
Cada usuario virtual usa una mesa distinta (`P01`…`P40` en la base de pruebas). El login se hace una vez
por rol en `setup()`: tiene su propio límite de 5 por minuto e IP.

| Escenario | Qué hace cada usuario virtual |
|---|---|
| `s2` menú y reservaciones | `GET /menu`, `/menu/categories/with-products`, `/mesas`, `/reservations` |
| `s3` pedidos y cobro | Ciclo completo: mesero crea y manda a cocina → cocina marca listo → mesero entrega → caja cobra; cocina consulta la lista |
| `s4` estadísticas | `/dashboard/admin/stats`, `/dashboard/admin/ventas-por-hora`, `/reportes/hoy` |
| `stress` rampa | 20 → 100 usuarios (5× la carga nominal), sostiene y baja a 20 para medir la recuperación |
| `stress` pico | 200 usuarios de golpe durante 30 s sobre pedidos |

## Resultados (13-nov-2026, API local contra Postgres local, una sola máquina de 12 núcleos)

**Carga nominal** (`load.js`, 20 usuarios virtuales por escenario, 5 min, 52 187 peticiones, 172/s):

| Métrica | Umbral | Resultado |
|---|---|---|
| p95 de lecturas (GET) | < 500 ms | **28,7 ms** ✅ |
| p95 de escrituras POST | < 800 ms | **202,6 ms** ✅ |
| p95 de escrituras PATCH | < 800 ms | **100,6 ms** ✅ |
| Peticiones fallidas | < 1 % | **0,18 %** ✅ |

**Esfuerzo** (`stress.js`, `FACTOR=0.5`, hasta 220 usuarios virtuales, 37 617 peticiones, 182/s):

| Métrica | Umbral | Resultado |
|---|---|---|
| p95 en la rampa (hasta 5×) | < 1 500 ms | **862 ms** ✅ |
| Peticiones fallidas | < 5 % | **3,67 %** ✅ |
| Caída del servicio | ninguna | Ninguna; al terminar respondía en 3 ms ✅ |

**Lectura de los errores.** Los fallos son 400 en cambios de estado: con más usuarios que mesas, dos
usuarios trabajan sobre la misma mesa y uno intenta mover un pedido que el otro ya movió. El API lo
rechaza como debe (las transiciones inválidas no pasan). No hubo 5xx.

**Punto de quiebre.** No se alcanzó en una sola máquina: k6 y el API compiten por el mismo procesador.
Hay que repetir la prueba con el workflow contra un entorno de pruebas desplegado (Render gratis duerme
y tiene 512 MB: allí el límite real será mucho menor).

## Hallazgo: el límite por IP

`ThrottlerModule` limita a **40 peticiones por minuto por IP**. En el restaurante todo el personal sale a
internet por la misma IP (la del módem), así que el límite es compartido por todos los teléfonos y la web:

- un teléfono con la lista de pedidos abierta consulta cada 30 s y el panel cada 60 s;
- con 4 teléfonos y la web de caja abiertos ya se rozan las 40 por minuto, y cualquier acción suma.

Desde este cambio el límite se configura con `THROTTLE_LIMIT` (por defecto 40, sin cambio de
comportamiento). **Recomendación para producción: `THROTTLE_LIMIT=300`**, y vigilar los 429 en el registro
del API. El login conserva su propio límite de 5 por minuto e IP.
