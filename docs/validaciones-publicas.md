# Plan de validaciones: sitio público, personal operativo y administración

> Versión 1 · 15-nov-2026. Fuente única de las reglas: el API (`GET /reglas` y los DTO). La web y la móvil
> muestran los mismos textos que devuelve el servidor. Este documento es el plan; el estado real de cada
> fila se marca en la columna **Estado** (✅ hecho y probado · 🟡 parcial · ⬜ pendiente).
> Pruebas: `pnpm test:integracion -- entradas` (todas las rutas), `-- publico`, `-- entre-cuentas` en el
> API, y `tests/integracion/publico.spec.ts` (Playwright contra el API real) en la web.

## 1. Decisiones de reglas (DV-nn)

| ID | Decisión | Motivo |
|---|---|---|
| DV-01 | Códigos: **400** validación (también formato o tamaño imposible para la base), **401** sin sesión o sesión caducada, **403** rol sin permiso, **404** no existe *o es de otra cuenta*, **409** conflicto (mesa ya reservada, duplicado), **402** tarjeta rechazada, **422** solo para llave foránea o `CHECK` de la base, **429** límite. Un 5xx solo por una falla real del servidor o de un tercero. | El cliente decide el mensaje por el tipo; un 404 para lo ajeno no revela que existe (IDOR). |
| DV-02 | El mensaje lo escribe el servidor y el cliente lo muestra tal cual en validación, conflicto y reglas de negocio; el cliente pone el suyo solo para sesión, permiso, límite, red y servidor (`mensajeDeError` en la web). | Un solo texto por regla; la móvil heredará los mismos (§7). |
| DV-03 | **Nombres de persona**: letras de cualquier alfabeto (acentos, ñ, ü), espacios, guion y apóstrofo entre letras; sin dígitos ni otros símbolos. Nombre y apellidos: 2–60 caracteres cada uno; nombre completo de la reserva: 2–120. Se juntan espacios repetidos; se guardan en MAYÚSCULAS (`TextoNegocio`, como hoy). Regex: `^\p{L}+(?:[ '’-]\p{L}+)*$` (flag `u`). | La regla actual de la web (máximo 2 palabras de 30) rechaza «María de los Ángeles» y «O’Higgins». |
| DV-04 | **Correo**: recortado y en minúsculas; máximo 254 (parte local ≤ 64, cada etiqueta del dominio ≤ 63); dominio con punto y TLD de ≥ 2 letras. Los correos ya guardados no se tocan. | RFC 5321; hoy la web corta en 100 y el API no limita en reservas. |
| DV-05 | **Teléfono**: selector de lada (por defecto +52) y número nacional. México: exactamente 10 dígitos. Otras ladas: 6–12 dígitos nacionales, E.164 ≤ 15. Se normaliza a E.164 (`+52XXXXXXXXXX`) en el cliente y en el servidor (`telefono()` ya lo hace). **Sin migrar** los datos existentes: el servidor sigue aceptando 10 dígitos sueltos, `52…` y formatos con espacios o guiones, y los normaliza al guardar. | Pedido explícito; la migración E.164 de producción sigue sin autorizar. |
| DV-06 | **Reservas**: anticipación, duración, margen de cierre, comensales máximos, días y horarios salen de `GET /reglas`. Horas en intervalos de **30 min**. Horizonte: **60 días** (`reservas.diasMaxAdelanto`, nuevo en `/reglas`). | La web no duplica reglas; 30 min es el intervalo que usa el restaurante al tomar reservas por teléfono. |
| DV-07 | **Ocupación máxima de una hora**: no queda ninguna mesa activa con capacidad ≥ N libre durante `[hora, hora + duración)` (solape real, contando reservas que empezaron antes). Esa hora aparece bloqueada con «Sin disponibilidad». | Es el mismo cálculo que acepta o rechaza la reserva (`estadoMesas`, API #170): lo que se ofrece es lo que se acepta. |
| DV-08 | **Comensales**: 1 a `comensalesMax` (50). Si N supera la mesa más grande, todas las mesas salen «Para M personas» y el formulario sugiere llamar. | Grupos grandes se atienden por teléfono. |
| DV-09 | **Cantidades** por platillo: enteros de 1 a `pedidos.cantidadMaxPorPlatillo` (99). Platillo no disponible o agotado: visible y no seleccionable, con «Agotado». | `CreateOrderMesaDto` y la regla del servicio (Fase 3). |
| DV-10 | **Montos**: números ≥ 0 con máximo 2 decimales. Precio de carta ≤ 100 000; caja (fondo, efectivo contado, cobro) ≤ 1 000 000; propina 0–100 000. Nunca se aceptan precio, total, descuento ni monto calculado desde el cliente: el servidor los calcula. | `ChargeOrderDto`, `OpenCashDto`, `CloseCashDto`; asignación masiva bloqueada (`forbidNonWhitelisted`). |
| DV-11 | **Texto libre**: todo campo de texto tiene máximo. Líneas cortas 60–150 según el dato; notas y peticiones 500; motivos 3–300; descripción de reporte 10–1000. Contador visible cuando el máximo es ≥ 100. | Hoy varios DTO no limitan (dirección, nómina, alta de usuario, ocasión, notas de reserva) y solo los frena el límite de 100 kB del cuerpo. |
| DV-12 | **RFC**: 12 (moral) o 13 (física) caracteres, en mayúsculas, `^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$`; se aceptan los genéricos `XAXX010101000` y `XEXX010101000`. **CP**: exactamente 5 dígitos. | Catálogo del SAT (CFDI 4.0). |
| DV-13 | **Nada se oculta**: lo no disponible se muestra deshabilitado con un motivo de 1–4 palabras («Cerrado», «Sin disponibilidad», «Con menos de 1 h», «Agotado», «Para 2 personas», «Reservada a esa hora»). | Principio de UX del encargo. |
| DV-14 | El servidor **revalida al enviar** dentro de una transacción con bloqueo (`pg_advisory_xact_lock`) y responde 409 si otra persona se adelantó. | Dos clientes a la vez (probado: 201 y 409). |
| DV-15 | Guardas automáticas: en el API, una prueba recorre los metadatos de **todos** los DTO y falla si un `string` no tiene límite de longitud o formato; en la web, una prueba recorre los `.tsx` y falla si un campo de texto (`Campo`, `AreaTexto`, `input`, `textarea`) no tiene `maxLength`. | Que los formularios nuevos también cumplan. |

## 2. Reglas de campo comunes (una sola definición)

| Tipo | Reglas | Normalización | Mensaje (cliente = servidor) |
|---|---|---|---|
| Nombre de persona | DV-03; 2–60 | NFC, sin controles, espacios juntos, MAYÚSCULAS al guardar | «Escribe tu nombre: solo letras, espacios, guion o apóstrofo (2 a 60).» |
| Nombre completo (reserva) | DV-03; 2–120 | ídem | «Escribe el nombre de quien reserva: solo letras (2 a 120).» |
| Correo | DV-04; ≤ 254 | recorte + minúsculas | «Escribe un correo válido, como nombre@dominio.com.» |
| Teléfono | DV-05 | solo dígitos + lada → E.164 | «Escribe 10 dígitos (sin la lada).» / otras ladas: «Escribe de 6 a 12 dígitos.» |
| Contraseña nueva | 8–64; minúscula, mayúscula, dígito y símbolo; sin secuencias ni datos personales (web) | ninguna (nunca se recorta) | «La contraseña no cumple todos los requisitos.» |
| RFC | DV-12 | recorte + MAYÚSCULAS | «El RFC no tiene un formato válido.» |
| Código postal | 5 dígitos | solo dígitos | «El código postal debe tener 5 dígitos.» |
| Línea corta (calle, colonia, ciudad, alias) | 1–150 (alias 1–40) | NFC, espacios juntos | «Máximo N caracteres.» |
| Notas, peticiones, indicaciones | 0–500 | NFC, conserva saltos de línea | «Máximo 500 caracteres.» |
| Motivo (cancelación, reembolso, corrección) | 3–300 (reembolso 5–300) | ídem | «Escribe el motivo (3 a 300 caracteres).» |
| Cantidad | entero 1–99 | — | «La cantidad debe ser un entero de 1 a 99.» |
| Monto | ≥ 0, 2 decimales, tope por campo (DV-10) | — | «Escribe un importe de 0 a N con hasta 2 decimales.» |
| Fecha | `YYYY-MM-DD` existente; rango por formulario | — | «Esa fecha no existe.» / «La fecha ya pasó.» |
| Hora | `HH:MM` 00:00–23:59 | — | «Esa fecha u hora no existe.» |
| Identificador en ruta | entero 1–2^31−1 o UUID | — | «El identificador no es válido.» (400) · ajeno o inexistente: 404 |

## 3. Batería estándar de casos de prueba

Cada campo se prueba con su batería (columna **Casos** de las tablas):

- **T (texto)**: válido típico · límite inferior y superior exactos · uno más del máximo · vacío · solo espacios · emojis · unicode combinado y ancho cero (`​`, `‮`) · byte nulo · acentos y ñ · pegado con saltos de línea y tabuladores · HTML (`<script>`, `<img onerror>`) · SQL (`' OR 1=1;--`) · 100 000 caracteres · arreglo, objeto, número, booleano y `null` en lugar de texto.
- **N (número)**: válido · mínimo y máximo exactos · uno fuera de cada lado · negativo · cero · decimal donde va entero · más de 2 decimales en montos · `1e308` · `NaN`/texto · cadena numérica · `null`.
- **F (fecha y hora)**: hoy, mañana, límite del horizonte y un día más · pasada · 29-feb en año no bisiesto · 30-feb · `24:00` · `99:99` · sin zona y con zona · día cerrado y día especial.
- **I (identificador)**: válido propio · ajeno (otra cuenta) · inexistente · `abc` · `-1` · `0` · `1.5` · desbordado (`99999999999999999999`) · inyección (`1' OR '1'='1`) · UUID nulo.
- **E (envío)**: doble clic · repetir la misma petición · dos clientes a la vez · campo extra (`rol`, `precio`, `total`, `descuento`) · cuerpo vacío · cuerpo arreglo · sin token · token caducado o de otra sesión · rol no permitido.

Criterio de aceptación de toda la batería: **nunca 5xx ni stack trace; siempre 4xx con mensaje claro; el servidor no confía en el cliente.**

## 4. Sitio público y cliente

### 4.1 Reserva (`/reservations` y panel de la landing) · `POST /reservations`, `GET /reservations/map`, `GET /reglas`

| Campo | Tipo | Reglas | Normalización | Mensaje | Cliente | Servidor | Casos | Estado |
|---|---|---|---|---|---|---|---|---|
| clienteNombre | texto | DV-03, 2–120 | MAYÚSCULAS al guardar | §2 nombre completo | zod `esquemaReservaContacto` | `CreateReservationDto` (`Length(2,150)` → 2–120 + regex) | T | 🟡 servidor sin regex |
| lada + clienteTelefono | selector + texto | DV-05 | E.164 | §2 teléfono | ⬜ sin selector de lada | `@Telefono` + `Matches` | T, «+52 771 123 4567», «771-123-4567», 9 y 11 dígitos | 🟡 |
| clienteEmail | correo | DV-04 | minúsculas | §2 correo | regex laxo `\S+@\S+\.\S+` | `@IsEmail` sin máximo | T, `a@b`, `a@b.c`, 255 caracteres | 🟡 |
| privacidad | casilla | obligatoria, sin premarcar | — | «Para reservar, acepta el uso de tus datos…» | ✅ | (no se envía) | marcada/desmarcada | ✅ |
| fecha | selector de días | días activos del restaurante, hoy … +60; los demás deshabilitados con «Cerrado» o «Fuera de plazo» | — | «Elige un día abierto.» | ⬜ hoy es `input date` sin bloqueo | `validarReserva` (día cerrado, especial) | F | ⬜ |
| hora | selector de horas (30 min) | dentro del horario del día y ≤ cierre − margen; ≥ ahora + anticipación (America/Mexico_City); con al menos una mesa apta libre; las demás deshabilitadas con «Cerrado», «Con menos de 1 h» o «Sin disponibilidad» | — | servidor: «Reservaciones de 13:00 a 23:00…», «Las reservaciones se hacen con al menos 1 hora de anticipación.» | ⬜ hoy es `input time` libre | ✅ `validarReserva` | F | ⬜ |
| aviso de anticipación | texto fijo | «Las reservas se hacen con al menos 1 hora de anticipación.» (valor de `/reglas`) | — | — | ⬜ | — | se ve en el paso 2 | ⬜ |
| numComensales | entero | 1–50 (`/reglas`) | — | «El número de personas debe ser de 1 a 50.» | 🟡 sin máximo | ✅ `Min/Max` | N | 🟡 |
| ocasion | texto | 0–60 | NFC | «Máximo 60 caracteres.» | 5 000 | ⬜ sin máximo | T | ⬜ |
| peticionesEspeciales | texto | 0–500, contador | NFC | «Máximo 500 caracteres.» | 5 000 | `Length(0,500)` | T | 🟡 |
| mesaId | elección en plano | mesas con capacidad ≥ N y libres; las demás deshabilitadas con motivo | — | 409 «Esa mesa ya está reservada…» / 400 «Esa mesa es para 2 personas…» | ✅ (#47) | ✅ transacción + bloqueo (#170) | I, E (carrera) | ✅ |

### 4.2 Pedido desde la ficha del platillo (en mesa y a domicilio) · `POST /pedidos/mesa`

| Campo | Tipo | Reglas | Mensaje | Cliente | Servidor | Casos | Estado |
|---|---|---|---|---|---|---|---|
| cantidad | entero (selector −/+) | 1–99; no supera existencias; platillo agotado → botones deshabilitados con «Agotado» | «La cantidad debe ser un entero de 1 a 99.» | 🟡 sin tope de existencias | ✅ entero 1–99 (#172) + regla de servicio | N, E | 🟡 |
| mesa | texto/QR | ≤ 20; mesa existente y activa | «La mesa no es válida.» | URL saneada | ✅ `MaxLength(20)` | T, I | ✅ |
| platilloId | id | entero ≥ 1, disponible | «El platillo no es válido.» | — | ✅ | I | ✅ |
| combo (items) | lista | ≤ 100 platillos | «Un pedido admite como máximo 100 platillos distintos.» | — | ✅ | E | ✅ |
| sesión | token | obligatoria | 401 → «Tu sesión caducó…» | ✅ (#46) | ✅ | E | ✅ |
| horario de cocina | regla | pedidos en mesa solo con cocina abierta | «Cocina recibe pedidos de 08:00 a 21:30.» | ✅ muestra el del API | ✅ | F | ✅ |

### 4.3 Pedido, carrito y checkout (`/menu/pedido`, `/menu/pedido/checkout`)

| Formulario | Campo | Reglas | Cliente | Servidor | Casos | Estado |
|---|---|---|---|---|---|---|
| Carrito | quitar platillo | solo del pedido propio y en «pendiente» | ✅ | 404 ajeno (probado) | I, E | ✅ |
| Carrito | cancelar pedido · motivo | 3–300 | 🟡 | `CancelOrderDto` | T, I | 🟡 |
| Carrito | confirmar | idempotente; doble envío sin duplicar | ✅ | sin 5xx (probado) | E | ✅ |
| Dirección | alias | 0–40 | 5 000 | ⬜ sin máximo | T | ⬜ |
| Dirección | linea1 (calle y número) | 1–150 | ✅ requerido | ⬜ sin máximo | T | 🟡 |
| Dirección | linea2, colonia, ciudad, estado | 0/1–100 | ✅ | ⬜ sin máximo | T | 🟡 |
| Dirección | codigoPostal | 5 dígitos | ✅ | ✅ `Length(5,5)` | T | ✅ |
| Dirección | referencias | 0–300 | 5 000 | ⬜ | T | ⬜ |
| Tarjeta (Stripe Elements) | número, fecha, CVC | los valida Stripe; nunca pasan por el API | Stripe | solo `pm_…` (#172) | Stripe test: 4242…, 4000 0000 0000 9995 (fondos), 4000 0027 6000 3184 (3DS) | 🟡 falta Playwright de pago |
| Propina | importe o % | 0–100 000, 2 decimales; % 0–100 | ⬜ revisar | `Max(100000)` | N | 🟡 |
| Factura (cliente) | RFC, razón social (1–300), uso CFDI (catálogo), régimen (catálogo), CP fiscal, correo | DV-12, DV-04 | ✅ `esquemaDatosFiscales` | ✅ `GuardarPerfilFacturacionDto` (razón social sin máximo ⬜) | T, I | 🟡 |
| Cupones / promociones | código | **no existe**; si se crea: 3–20, `[A-Z0-9-]`, MAYÚSCULAS, se valida en servidor contra vigencia y uso | — | — | — | ⬜ fuera de alcance |

### 4.4 Cuenta del cliente

| Formulario | Campo | Reglas | Cliente | Servidor | Casos | Estado |
|---|---|---|---|---|---|---|
| Registro | nombre, apellidos | DV-03, 2–60 | 🟡 2 palabras × 30 | 🟡 `MaxLength(50)` sin regex | T | 🟡 |
| Registro | correo | DV-04 | 🟡 máx 100 | 🟡 `MaxLength(100)` | T | 🟡 |
| Registro | lada + teléfono | DV-05 | 🟡 solo +52 | ✅ E.164 | T | 🟡 |
| Registro | contraseña | §2 | ✅ | ✅ (mensaje de coincidencia en español, #172) | T | ✅ |
| Registro | términos | obligatoria | ✅ | (no se envía) | — | ✅ |
| Inicio de sesión | correo, contraseña | mensaje genérico, 5 intentos/min | ✅ | ✅ `@Throttle` + bloqueo | E | ✅ |
| Recuperar contraseña | correo | DV-04; respuesta igual exista o no | revisar | revisar | T, E | ⬜ |
| Perfil | nombre, apellidos, teléfono, correo, dirección | como registro y dirección | 🟡 `lineaRequerida` sin regex | 🟡 `UpdateUserDto` | T | 🟡 |
| Privacidad | interruptores | booleanos | ✅ | ✅ `UpdatePrivacyDto` | tipos equivocados | ✅ |
| Eliminar cuenta | contraseña | obligatoria, 5/min | ✅ | ✅ `DeleteAccountDto` | E | ✅ |

### 4.5 Otros públicos

| Formulario | Campo | Reglas | Estado |
|---|---|---|---|
| Reportar un problema | tipo (catálogo), descripción 10–1000, ruta `^/…` | ✅ servidor `CrearReporteDto`; 5/min | ✅ |
| Buscador de la carta | texto 0–80, sin llamada al servidor (filtra en el cliente) | 🟡 añadir `maxLength` |
| Filtros (categorías, etiquetas) | valores de catálogo; un valor desconocido se ignora | ✅ |
| Preferencias de accesibilidad | valores de catálogo en `localStorage`; un valor dañado vuelve al de fábrica | ✅ |
| Contacto | **no existe** formulario (teléfono, WhatsApp y correo como enlaces) | — |

## 5. Personal operativo

| Pantalla | Campo | Reglas | Servidor | Casos | Estado |
|---|---|---|---|---|---|
| Mesero · abrir mesa | mesa, comensales 1–50, notas cocina 0–500, notas por platillo 0–200 | ✅ DTO | T, N | ✅ |
| Mesero · estados | `estatus` del catálogo y transición válida por rol | ✅ `UpdateOrderStatusDto` + tabla de transiciones | I, E | ✅ |
| Cocina · incidencia | tipo (catálogo), orden (UUID), mensaje 0–300, minutos 1–240 | ✅ `CreateIncidentDto` | T, N, I | ✅ |
| Cocina/caja · merma | producto o nombre 2–120, cantidad 0.001–100 000, unidad 0–20, motivo (catálogo), justificación 3–300 | ✅ `CreateWasteDto` | T, N | ✅ |
| Caja · abrir | fondo 0–1 000 000 | ✅ | N | ✅ |
| Caja · cerrar (corte) | efectivo contado 0–10 000 000, notas 0–500 | ✅ | N, T | ✅ |
| Caja · cobro | método (id), monto 0.01–1 000 000, recibido 0–1 000 000, propina 0–100 000, etiqueta 0–60, referencia 0–100 | ✅ `ChargeOrderDto`; el servidor calcula saldo y cambio | N, E (doble cobro) | ✅ |
| Caja · movimiento | concepto 1–150, importe > 0, responsable 0–100, notas 0–500 | revisar DTO | T, N | ⬜ |
| Caja · factura al cerrar | como factura del cliente | ✅ | T | 🟡 |
| Reembolso (admin) | motivo 5–300, cancelar pedido (bool) | ✅ | T | ✅ |

## 6. Administración

| Pantalla | Campos y reglas | Servidor | Estado |
|---|---|---|---|
| Usuarios y roles | nombre/apellidos DV-03; correo DV-04; teléfono DV-05; contraseña §2 (hoy solo mínimo 8 ⬜); rol del catálogo `CREATABLE_ROLES`; no puede quitarse el rol al último admin | `CreateUserDto` (sin máximos ⬜), `ChangeRoleDto` ✅ | 🟡 |
| Empleados y nómina | puesto y nombre 1–100, departamento 0–60, pago semanal 0.01–1 000 000 (2 dec.) | `CreatePayrollEntryDto` (sin máximos ⬜) | 🟡 |
| Movimientos de nómina | empleado (UUID), tipo y concepto (catálogo), monto 0.01–1 000 000, periodo inicio ≤ fin, justificación 5–500 | ✅ (falta inicio ≤ fin ⬜) | 🟡 |
| Carta · platillo | nombre 1–150, descripción 0–255, precio 0–100 000, tiempo 0–600, etiquetas ≤ 5 del catálogo, imagen https de la nube | ✅ `CrearPlatilloDto` | ✅ |
| Carta · importar | archivo CSV/XLSX ≤ tamaño máximo y por firma de bytes; vista previa con errores por fila | ✅ | ✅ |
| Promociones y paquetes | título 1–120, descripción 0–500, precios ≥ 0, fin ≥ inicio, imagen de la nube | 🟡 revisar máximos | 🟡 |
| Mesas | número 1–10, nombre 0–50, capacidad 1–30, área (id), forma (catálogo) | ✅ `MesaDto` | ✅ |
| Reservas (admin) | estado (catálogo), motivo de cancelación 3–300 (obligatorio al cancelar), notas 0–500 ⬜, comensales 1–50 ⬜ máximo, fecha y mesa con la misma regla que la creación ⬜ | `UpdateReservationDto` | 🟡 |
| Facturas y solicitudes | conceptos (descripción 1–1000, cantidad > 0, precio > 0), RFC DV-12; rechazar/cancelar con motivo | 🟡 `motivo` sin DTO (string suelto) | 🟡 |
| Inventario · productos | nombre 0–150, sku 0–50, categoría 0–50, unidad 0–20, existencias y costos ≥ 0 | ✅ | ✅ |
| Proveedores | nombre 1–150, contacto, correo DV-04, teléfono DV-05, web 0–255, días de entrega ≥ 0 | ✅ | ✅ |
| Órdenes de compra | proveedor obligatorio, ≥ 1 producto, cantidades ≥ 1 | ✅ (#172) | ✅ |
| Gestor del sitio y textos | título 0–80, subtítulo 0–200, nosotros 0–600, colores `#RRGGBB`, teléfono/WhatsApp, imágenes de la nube ≤ 5 | ✅ `SitioDto` | ✅ |
| Configuración del restaurante y horarios | apertura < cierre, cocina ≤ cierre, días especiales con fecha futura | sin pantalla ni endpoint de edición (se edita en la base) | ⬜ fuera de alcance |
| Reportes y exportación | rango de fechas inicio ≤ fin ≤ hoy, tipo del catálogo, formato del catálogo | revisar | 🟡 |
| Filtros y búsquedas de tablas | texto 0–80, fechas válidas, paginación `limit` 1–100 y `cursor` ≥ 1 | 🟡 `GetUsersQueryDto` ✅; otros sin DTO | 🟡 |

## 7. Paridad con la móvil (no se implementa ahora)

La móvil (Clean Architecture) ya lee `GET /reglas` en reservas (#464). Falta allí:

- usar `mensajeDeError` equivalente (un texto por tipo) en lugar de mensajes por pantalla;
- el plano con `numComensales` y los motivos de cada mesa (API #170);
- el selector de días y horas bloqueados con motivo;
- lada + teléfono E.164 y las reglas de nombre y correo de §2;
- límites de longitud y contadores en los campos de texto.

Los textos son los del servidor, así que no hay que copiarlos a mano.

## 8. Orden de ejecución (tope 17-nov)

1. ✅ Bugs bloqueantes (a) y (b) con regresión contra el API real (API #170, web #46/#47).
2. ✅ Ninguna entrada inválida da 500 en los 142 endpoints (API #172); acceso entre cuentas y precios (#173).
3. Reserva: días y horas bloqueados con motivo, aviso de anticipación (`/reglas` + `GET /reservations/horas`).
4. Campos públicos: nombre, correo, teléfono con lada, máximos y contadores (web) y los mismos límites en los DTO.
5. Guardas automáticas (DV-15).
6. Pago con Stripe en Playwright (tarjeta aprobada, fondos insuficientes, 3D Secure) y factura en sandbox.
7. Resto de formularios operativos y de administración marcados ⬜/🟡.
