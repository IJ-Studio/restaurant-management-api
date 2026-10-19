# Inventario de endpoints de restaurant-management-api

Se levantó leyendo el código de este repositorio (rama `develop`, commit `beface1`) el
2026-10-12. Sirve como contrato para la app móvil. Hay que actualizarlo cuando el API cambie.

- **Base URL:** `EXPO_PUBLIC_API_URL` (en preview y producción debe ser HTTPS).
- **Autenticación:** `Authorization: Bearer <accessToken>`. El guard global `JwtAuthGuard` protege
  todo excepto lo marcado con `@Public()`. Además, el token se valida contra la caché (`user-<id>`),
  así que `sign-out` lo revoca.
- **Rate limit global:** `ThrottlerGuard`, 40 peticiones por minuto por IP (responde 429).
- **Roles** (`src/common/constants/roles.ts`): `1 admin`, `2 cajero`, `3 mesero`, `4 cocina`,
  `5 cliente`. La app móvil es solo para los roles 1 a 4.

## Auth — HU-01

| Método | Ruta | Acceso | Body / respuesta |
|---|---|---|---|
| POST | `/auth/sign-in` | Público | `{ email, password }` (password ≥ 8) → `200 { accessToken, user }`. `401` genérico si las credenciales fallan; `429` si la cuenta está bloqueada |
| GET | `/auth/me` | JWT | `{ user: { id, email, roleId, tokenId } }` (payload del JWT) |
| POST | `/auth/sign-out` | JWT | `200 { message }`: revoca el token en la caché |
| POST | `/auth/sign-up` | Público | Registro de clientes (rol 5). **La app móvil no lo usa**. Reglas abajo → `201 { user }` sin contraseña |

- El JWT trae `{ id: string, email, roleId, tokenId }`. Expira en `JWT_ACCESS_TOKEN_TTL` (3600 s
  por defecto) y no hay refresh token: con un 401 se cierra la sesión.
- `user` en la respuesta de sign-in y sign-up es una lista de campos permitidos: `id, name, lastname,
  email, phone, verified, roleId, isActive, createdAt`. Nunca trae la contraseña ni los contadores
  de seguridad. El mapper de la app solo toma `id, name, lastname, email, roleId`.
- **Validación estricta** (`ValidationPipe` con `whitelist` + `forbidNonWhitelisted`) en el body de
  sign-in y sign-up: un campo que no esté en el DTO responde `400`.
- **Bloqueo por cuenta:** 5 contraseñas incorrectas seguidas bloquean la cuenta 15 minutos
  (`429 { message, error, retryAfterSeconds }`, con el texto "Demasiados intentos. Debes esperar N
  segundos."). Un login correcto reinicia el contador. Además hay un límite de 5 intentos por
  minuto por IP en sign-in (`429` de Nest).

### Reglas de `POST /auth/sign-up`

La fuente de verdad es `src/auth/dto/sign-up.dto.ts`; el formulario del web puede ser más estricto
pero nunca más permisivo.

| Campo | Regla |
|---|---|
| `name`, `lastname` | texto, 1 a 50 caracteres (columna `varchar(50)`) |
| `email` | correo válido, hasta 100 caracteres (columna `varchar(100)`) |
| `phone` | formato internacional: `+` y de 10 a 15 dígitos, sin espacios (`+525512345678`) |
| `password` | 8 a 64 caracteres, con minúscula, mayúscula, número y un símbolo (cualquier carácter que no sea letra, número ni espacio) |
| `passwordConfirm` | igual a `password` |

No se aceptan `roleId`, `verified` ni `loginAttempts`: el servicio siempre crea clientes con
`verified = false`.

**Correo ya registrado:** responde `400` con un mensaje genérico (`No se pudo crear la cuenta con esos
datos. Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.`) que no confirma que el correo
tenga cuenta. Solo la violación UNIQUE de Postgres (`23505`) produce ese mensaje; cualquier otro fallo
de base de datos responde `500`. El endpoint limita a 10 registros por minuto por IP. Esto reduce, pero
no elimina, la enumeración de correos: cerrarla del todo requiere verificación por correo.

## Menú — HU-03

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| GET | `/menu` o `/menu/platillos` | Público | `?categoriaId=`. Devuelve filas de `platillos` |
| GET | `/menu/categories/with-products` | Público | Categorías con sus platillos anidados |
| GET | `/menu/items/:id` | Público | Detalle de un platillo |

Campos útiles de cada platillo: `id, categoriaId, nombre, descripcion, descripcionCorta, imagenUrl,
precio, tiempoPreparacion, disponible, esVegetariano, esVegano, esSinGluten, esPicante, nivelPicante,
esPopular, esNuevo, esDelChef`. **`precio` llega como string** (es `numeric` en Postgres): el mapper
lo convierte a número.

## Reservaciones — HU-04

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| GET | `/reservations/availability` | Público | Disponibilidad |
| GET | `/reservations/map` | Público | Mapa de mesas |
| POST | `/reservations` | Público | `{ clienteNombre, clienteTelefono, clienteEmail, fechaHora (ISO), numComensales 1–50, mesaId?, peticionesEspeciales?, ocasion?, canal? }` |
| GET | `/reservations` | Admin | `?fechaDesde&fechaHasta&estatus&clienteNombre` |
| GET / PATCH | `/reservations/:id` | Admin | Detalle / actualizar |
| GET | `/mesas` | Público | Mesas |

## Pedidos — HU-05 / HU-06

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| POST | `/pedidos/mesa` | Público | `{ usuarioId, mesa?, items?: [{ platilloId, cantidad }] }`: crea un carrito `pendiente` |
| GET | `/pedidos/usuario` | Público | `?mesaId&usuarioId&tipo` |
| POST | `/pedidos/confirmar/:id` | Público | `pendiente → abierta` (manda a cocina) |
| DELETE | `/pedidos/item/:id` | Público | Quita un item de un pedido `pendiente` |
| PATCH | `/pedidos/cancelar/:id` | Público | `abierta → cancelada` |
| GET | `/pedidos/admin/recent` | Admin | Pedidos activos recientes |
| GET | `/pedidos/admin/stream` | Admin | SSE: reenvía la lista cada 30 s |
| POST | `/pagos/crear-intento` | Público | PaymentIntent de Stripe |
| POST | `/pagos/webhook` | Público | Webhook de Stripe (body raw) |

Estados que se ven en el código: `pendiente`, `abierta`, `cancelada`, `completada`, `entregada`.

## Admin — HU-08

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/dashboard/admin/stats` | Admin |
| GET | `/dashboard/admin/ventas-por-hora` | Admin |
| GET | `/dashboard/{admin,cajero,mesero,cocina}` | Solo el rol correspondiente (útil para probar RBAC en HU-02) |
| GET/POST/PATCH/DELETE | `/users` | Admin (alta de personal) |

## Qué falta en el API (para José / Irving)

| Historia | Falta |
|---|---|
| HU-04 | `GET /reservations` solo permite Admin: hay que abrirlo a Mesero (y Cajero) para el listado operativo |
| HU-06 | No hay un endpoint para que Cocina o Mesero cambien el estado (`abierta → en preparación → lista → entregada`), ni un stream que no sea solo de Admin |
| HU-07 | No existe el registro de tokens de dispositivo ni el envío de push |

## Cobro en caja (HU-05): bloqueo de diseño

El flujo de pagos del API está pensado para el **cliente web** y no sirve tal cual para el Cajero:

- `POST /pagos/crear-intento` exige que la orden siga en **`pendiente`** y que su `clienteId` sea el del usuario que paga.
- Cuando el mesero manda el pedido a cocina (`POST /pedidos/confirmar/:id`), la orden pasa a **`abierta`**, así que
  el Cajero ya no podría cobrarla, y además la orden queda a nombre del mesero, no del cajero.

Hace falta un endpoint para el personal (p. ej. `POST /pagos/cobrar-orden/:ordenId`, solo rol Cajero) que cree el
PaymentIntent de una orden `abierta` con el total calculado en el servidor, y que el webhook la marque como pagada.

## Hallazgos de seguridad del API (revisar antes de HU-01/HU-02)

1. ~~Sign-in devolvía el hash de la contraseña~~ → resuelto en #90 (y también en sign-up).
2. ~~Enumeración de usuarios en el login~~ → resuelto en #90: `401` genérico.
3. ~~Sin `ValidationPipe`~~ → aplicado solo a sign-in y sign-up (no global: varios DTOs de otros
   módulos no tienen decoradores y `whitelist` les quitaría todos sus campos).
4. ~~Login sin límite propio~~ → resuelto: 5/min por IP y bloqueo por cuenta.
5. **Endpoints de pedidos y pagos públicos.** Cualquiera sin token puede crear, confirmar o cancelar
   pedidos. Para la app móvil deben exigir JWT y rol (HU-05/HU-06).
6. **`GET /users/:id` y `PATCH /users/:id`** solo exigen JWT, sin validar que sea el mismo usuario o Admin (BOLA).
7. **`GET /menu` hace `select *`**: expone `precioCosto` en un endpoint público.
8. No hay `helmet` (cabeceras de seguridad) ni `/db-metrics` protegido (`@Public()`).
9. **`ReservationsService.findAll` aplica solo el último filtro**: cada `.where()` de Drizzle reemplaza al anterior
   (`fechaDesde` + `estatus` → solo `estatus`). Hay que combinarlos con `and(...)`. La app manda solo `fechaDesde`
   y filtra los estados activos del lado del cliente.
