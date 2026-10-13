# Deuda técnica y plan de mejora: restaurant-management-api

Revisión del 2026-10-11. Este documento ordena las mejoras que necesita el API para sostener la app móvil del personal, la web del personal y la web pública, y propone cómo abordarlas sin detener el desarrollo de la app.

**Severidad:** Crítico · Alto · Medio · Bajo. **Esfuerzo:** S (menos de medio día) · M (1 a 2 días) · L (3 días o más).
**Alcance:** [M] app móvil · [W] web del personal · [C] web pública y clientes · [T] transversal.

Orden: A app móvil (con calendario), B web del personal, C parte pública, D capas transversales, E arquitectura y buenas prácticas, F pruebas, G plan por fases, H objetivos de seguridad, I verificación de configuración, J web, K manejo de errores, L defensa en profundidad, M plataformas, N reducción de archivos y O optimización. Los detalles de seguridad se gestionan en un documento privado del equipo.

---

## A. App móvil del personal [M]

### Antes de HU-01 y HU-02

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-S | **Endurecimiento de autorización y de datos expuestos** (DT-01 a DT-06): revisión de control de acceso por recurso y por campo, y de las respuestas de autenticación. Prioridad alta; el detalle está en el documento privado | Crítico | M |
| DT-08 | Sesiones en almacenamiento compartido y persistente (Redis) para que un reinicio del servidor no cierre las sesiones del personal; decidir si se permite más de una sesión por usuario | Alto | M |
| DT-10 | Política de inicio de sesión: límites específicos por ruta, bloqueo temporal, refresh o login periódico, verificación de la fortaleza del secreto de firma | Alto | M |

### Antes de HU-04

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-11 | Reservaciones: abrir la consulta y edición a cajero y mesero, registrar quién la crea y limitar la creación para evitar abuso | Medio | S |
| DT-25 | Consistencia: transacciones en pedidos y verificación de que dos reservas no ocupen la misma mesa | Medio | M |

### Antes de HU-05 (2 al 10 de noviembre)

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-16 | Cobro del Cajero: adaptar `crear-intento` al flujo de caja (estados aceptados, rol Cajero, el resto 403). La HU no prevé rama de API, pero la necesita | Crítico | M |
| DT-04 | Pedidos: operar siempre con el usuario autenticado y control de pertenencia | Alto | M |
| DT-17 | Máquina de estados del pedido; registrar el mesero que atiende (`atendidoPor`); pedidos de mesa sin cliente asociado | Alto | M |
| DT-03 | Idempotencia del webhook de Stripe (deduplicar por identificador de evento) | Medio | S |
| DT-12 | Importes en centavos o decimales exactos | Medio | M |

### Antes de HU-06 (10 al 13 de noviembre)

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-18 | Canal en tiempo real para todos los roles de staff, basado en eventos y no en consultas periódicas; compatible con la autenticación de la app móvil | Alto | M |
| DT-17 | Endpoint `PATCH /pedidos/:id/estatus` con transiciones validadas por rol | Alto | M |

### Antes de HU-07 (17 al 20 de noviembre)

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-19 | Notificaciones push: tabla de tokens de dispositivo, endpoints de alta y baja, envío con el Expo Push API enrutado por rol, manejo de recibos y payload sin datos personales | Alto | L |

---

## B. Web del personal [W]

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-S | Control de acceso por rol en todas las funciones administrativas (incluido el módulo de respaldos) | Crítico | S |
| DT-09 | Respaldos: cifrado, almacenamiento privado, restauración probada, política de retención y segunda copia | Alto | L |
| DT-26 | Revisión de los módulos pendientes (`platillos`, importación, exportación, métricas, demanda predictiva, segmentos y no-show): roles, tipo y tamaño de archivos, rendimiento | Alto | M |
| DT-27 | Auditoría de cambios en nómina | Bajo | M |
| DT-28 | Revisión del rendimiento de las consultas del dashboard | Medio | M |

---

## C. Web pública y clientes [C]

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-S | Pagos, direcciones, facturación y facturas: acceso siempre autenticado y limitado al dueño | Crítico | M |
| DT-07 | Validación de entrada global (`ValidationPipe`) y DTOs en todos los endpoints; probar contra la web antes de activarla | Alto | M |
| DT-11 | Límites y verificación en reservas públicas | Medio | M |
| DT-13 | Claves de Facturapi separadas por entorno | Medio | S |
| DT-29 | Caché de lectura para menú y mesas | Bajo | S |

---

## D. Capas transversales [T]

| ID | Capa | Mejora | Sev | Esf |
|---|---|---|---|---|
| DT-20 | Base de datos gestionada | Revisar la exposición de la API de datos, activar políticas por fila y limitar los permisos de los roles públicos. Ver sección I | Crítico | S |
| DT-21 | Borde HTTP | `helmet`, límite de tamaño de cuerpo, CORS por entorno, HTTPS y límites por ruta | Alto | S |
| DT-22 | Observabilidad | Registro estructurado, ID de correlación, Sentry del API con filtrado de datos sensibles, `/health` y alertas | Alto | M |
| DT-30 | Errores | Filtro global de excepciones y códigos de error estables | Medio | M |
| DT-31 | Base de datos | Usuarios con permisos mínimos, índices, revisión del esquema y campos sin uso mediante migraciones | Alto | L |
| DT-23 | Dependencias | Un solo gestor de paquetes y un solo ORM, retirar paquetes sin uso (`ioredis`, `mysql2`, `typeorm`), `npm audit` y Dependabot | Medio | M |
| DT-32 | Contrato | Montar Swagger en desarrollo y staging y publicar el contrato OpenAPI | Medio | S |
| DT-33 | Flujo y CI/CD | Ramas protegidas, PR con revisión, CI (lint, tipos, pruebas), CodeQL, Gitleaks y `cd-api.yml` a staging, como en el repo móvil | Alto | M |
| DT-34 | Cumplimiento | Aviso de privacidad, retención y borrado de datos personales y fiscales | Medio | M |
| DT-35 | Configuración | Validar las variables de entorno al arrancar y separarlas por entorno | Medio | S |
| DT-14 | Residuos | Resolver `ZenGuard`, el script `test:e2e` y el `lint --fix` en CI | Bajo | S |

---

## E. Arquitectura, patrones y buenas prácticas

**Principio:** no se reescribe el API. Lo nuevo nace con la arquitectura objetivo (las ramas de API de HU-05, HU-06 y HU-07 sirven como módulos de referencia) y lo existente se migra cuando se toca. Hoy la referencia interna es el módulo `menu` (repositorio, mapper y DTOs de respuesta).

### E.1 Estado observado y objetivo

| ID | Aspecto | Observado | Objetivo | Sev | Esf |
|---|---|---|---|---|---|
| DT-15 | Capas | Los servicios (`orders`, `users`, `auth`, `reservations`) consultan Drizzle directamente; solo `menu` e `import/export` usan repositorios. Algunos controladores llevan lógica (`reservations` arma fechas y duración; `orders` ramifica por parámetros) | Controlador solo HTTP, servicio con reglas de negocio, repositorio con las consultas | Medio | L |
| DT-36 | Servicios de terceros | Stripe, Facturapi, Supabase Storage y Drive se usan directo dentro de los servicios, sin interfaz | Puertos y adaptadores (E.2), que además permiten pruebas con mocks | Medio | M |
| DT-37 | Estados y eventos | El estado del pedido es un texto libre cambiado en varios sitios; no hay eventos | Máquina de estados explícita y eventos de dominio (E.2) | Alto | M |
| DT-38 | Acceso a recursos | La autorización se reparte entre `@UseGuards`, `@Roles(1)` y comprobaciones dentro de los servicios | Decorador compuesto `@Auth(...)` y política de propiedad reutilizable | Alto | M |
| DT-39 | Convenciones de API | Mezcla de idiomas y estilos en rutas (`/pedidos`, `/reservations`, `/menu/orders`), sin paginación, sin versionado, errores con formatos distintos | Convención única para endpoints nuevos (E.4); no renombrar los existentes para no romper la web | Medio | S |
| DT-40 | Calidad de código | `any` en peticiones y DTOs; duplicación (`agregarACarritoMesa` y `agregarACarritoDomicilio` casi idénticos); números mágicos (rol `1`, `3`, ventana de 2 minutos, 90 minutos, TTL 3600) aunque existe `ROLES`; código comentado (Drive, descarga de respaldos, ZenGuard); `process.env` leído en servicios junto a configuración tipada para JWT | Ver E.3 | Medio | M |
| DT-41 | Orden y nombres | Carpeta `roles/` que contiene el dashboard, carpeta `rrhh/` vacía, `jwt-auth.guards.ts` en plural, importaciones mezcladas (`src/...` y `../../src/...`) | Estructura y alias de importación únicos | Bajo | S |
| DT-42 | Documentación técnica | README sin guía de arranque ni decisiones de arquitectura | README, ADR y guía de contribución (E.5) | Medio | S |
| DT-43 | Operación | **Por verificar:** cierre ordenado del servidor, migraciones, comprobación de salud | Principios de aplicación de 12 factores (E.5) | Medio | S |

### E.2 Patrones de diseño recomendados

| Patrón o práctica | Dónde aplicarlo | Beneficio |
|---|---|---|
| Capas: controlador, servicio, repositorio | Todo módulo nuevo; migrar `orders`, `reservations` y `users` al tocarlos | Lógica probada sin HTTP ni BD |
| Puertos y adaptadores (Adapter) | `PaymentGateway` con `StripeAdapter`, `InvoicingGateway` con `FacturapiAdapter`, `PushGateway` con `ExpoPushAdapter`, `FileStorage` con `SupabaseStorageAdapter` | Cambiar de proveedor sin tocar el negocio; mocks en pruebas. Espeja el Adapter de la app (HU-05) |
| State (máquina de estados) | `OrderStatus` y tabla de transiciones por rol en `orders/domain` | Validar cada cambio en un solo lugar (HU-06) |
| Observer (eventos de dominio) | `@nestjs/event-emitter`: `order.status.changed` lo escuchan notificaciones (HU-07) y el stream (HU-06) | El módulo de pedidos no conoce a notificaciones ni al stream. Espeja el Observer de la app |
| Strategy | Enrutamiento de notificaciones por rol: cocina avisa al mesero de `atendidoPor`, el mesero avisa a los cajeros | Agregar reglas sin condicionales anidados |
| Caso de uso (Facade) | `ConfirmOrderUseCase`, `ChargeOrderUseCase` encadenan validación, estado, cobro y evento | Flujos largos con un único punto de entrada. Espeja `checkout()` de la app |
| Política de acceso | `@Auth(...roles)` más política "dueño o staff" reutilizable | Una sola manera de proteger un recurso |
| DTO de entrada y de salida con mapper | Todo endpoint; salida con `@Exclude` o mapper explícito | No filtrar columnas internas |
| Unidad de trabajo | Helper sobre `db.transaction` | Pedidos y reservas consistentes |
| Objeto de valor `Money` | Totales, IVA y cobros en centavos | Sin errores de redondeo |
| Filtro global de excepciones y errores de dominio | `src/common/filters` | Respuestas de error uniformes sin detalles internos |
| Interceptores | Registro de peticiones, ID de correlación, tiempo de espera | Trazabilidad |
| Configuración tipada y validada | `ConfigModule` con esquema; los servicios no leen `process.env` | Falla al arrancar si falta algo |

**Estructura objetivo de un módulo:**

```
src/<modulo>/
  <modulo>.module.ts
  <modulo>.controller.ts      solo HTTP: valida, delega y responde
  <modulo>.service.ts         reglas de negocio y casos de uso
  repositories/               solo consultas Drizzle
  dto/                        entrada
  dto/response/               salida
  domain/                     estados, transiciones, constantes
  events/                     eventos de dominio
  adapters/                   solo si habla con un tercero
src/common/                   guards, decorators, filters, interceptors, pipes
src/infrastructure/           database, cache, gateways de terceros
```

Regla de dependencia: el controlador depende del servicio, el servicio del repositorio y de los puertos; nada del dominio importa Express, Stripe ni Drizzle directamente.

### E.3 Calidad de código

| Práctica | Detalle |
|---|---|
| TypeScript estricto | `strict`, `noImplicitAny`, `strictNullChecks`. **Por verificar** el `tsconfig` actual |
| ESLint | Reglas `no-explicit-any`, `no-floating-promises`, `no-unused-vars`, complejidad máxima 10 y funciones de hasta 40 líneas |
| Prettier y hooks | Formato automático; `husky` y `lint-staged` antes de cada commit; `lint` sin `--fix` en CI |
| Commits | `commitlint` con Conventional Commits, igual que en el repo móvil |
| Quality gate | El mismo análisis estático que se configura en el repo móvil (HU-00), aplicado al API |
| Constantes y duplicación | Sustituir números mágicos por `ROLES`, `ORDER_STATUS` y configuración; unificar los carritos de mesa y domicilio |
| Limpieza | Borrar código comentado y `console.log`; resolver o eliminar `ZenGuard` y el cron y respaldos a Drive |
| Convención de nombres | Archivos en kebab-case, clases en PascalCase; un solo idioma para nombres nuevos |

### E.4 Convenciones de API (para endpoints nuevos)

- Sustantivos en plural, verbos HTTP correctos y códigos de estado coherentes (201, 204, 400, 401, 403, 404, 409).
- Listas con paginación (`limit` y `cursor`) y filtros por query.
- Fechas en ISO 8601 UTC; la zona horaria se resuelve en el cliente.
- Errores con un formato único: `code`, `message` y, si aplica, `details`.
- Versionado solo para endpoints nuevos o con cambios incompatibles; los existentes no se renombran.
- Cambios de contrato documentados en el OpenAPI antes de implementarse.

### E.5 Operación y documentación

- **Doce factores:** configuración por variables de entorno, sesiones fuera de memoria (DT-08), registros a la salida estándar, `enableShutdownHooks`, migraciones como paso separado del arranque y `/health` para el despliegue.
- **Documentación:** README con arranque y variables, ADR en `docs/adr/` (ADR-001 capas, ADR-002 estados y eventos, ADR-003 sesiones), guía de contribución con el flujo de ramas, y Swagger en desarrollo y staging (DT-32).

---

## F. Pruebas

Hoy no hay ninguna prueba automatizada (no existe ningún `*.spec.ts`).

| Tipo | Qué cubre | Dónde empezar |
|---|---|---|
| Unitarias | Servicios con lógica: totales, máquina de estados, reglas de reserva | Estados de pedido (HU-06) |
| Integración (Jest y Supertest) | Controlador, guard y BD de prueba juntos | Auth, pedidos y pagos |
| Autorización | Por cada ruta: sin token, rol equivocado y recurso ajeno | Todas las rutas de las secciones A y C |
| Contrato | Que la respuesta coincida con el OpenAPI y no incluya campos internos | Auth y usuarios |
| Seguridad | Validación de entrada, límites de tasa, firma del webhook | Las pruebas ya planeadas en HU-05, 06 y 07 |
| Punta a punta | Iniciar sesión, pedido, cocina, cobro y notificación | Antes de la entrega (HU-09) |
| Carga | Conexiones simultáneas del stream y del dashboard, picos de reservas | Antes de producción |
| Regresión | Todo lo anterior en cada PR | En el CI |

---

## G. Plan por fases

| Fase | Cuándo | Qué | IDs |
|---|---|---|---|
| 0. Inmediata | Esta semana | Gestión de secretos, protección de las rutas internas de la web, endurecimiento de autorización y datos expuestos, base de datos gestionada, protecciones del repositorio, respaldos y dependencias | DT-W25, DT-W26, DT-S, DT-20, DT-44 a DT-49, DT-09 |
| 1. Para no bloquear la móvil | Antes del 2 de noviembre y durante los sprints 1 al 4 | Sesión, validación global, pedidos con usuario autenticado, cobro del cajero, estados, stream por rol, tokens y push. **Todo con la arquitectura objetivo** (capas, adaptadores, eventos, `@Auth`) | DT-07, DT-08, DT-10, DT-04, DT-16, DT-17, DT-18, DT-19, DT-11, DT-03, DT-36, DT-37, DT-38 |
| 2. Base de calidad del API | En paralelo, sin competir con la móvil | Ramas protegidas y CI, calidad de código, logs y Sentry, cabeceras, Swagger, configuración, convenciones y ADR | DT-33, DT-40, DT-22, DT-21, DT-32, DT-35, DT-14, DT-39, DT-41, DT-42, DT-43 |
| 3. Web y cliente | Después de la entrega móvil | Pagos y facturación, módulos pendientes de revisión, respaldos y restauración | DT-S, DT-26, DT-09, DT-13, DT-28 |
| 4. Estructural | Después de las demás | Migrar los módulos antiguos a capas, esquema de BD, dependencias, cumplimiento y carga | DT-15, DT-31, DT-23, DT-34, DT-12, DT-25 |

Antes de cada cambio que toque dinero, sesión o roles se corre la suite de autorización del apartado F.

---

## H. Objetivos de seguridad (OWASP API Security Top 10, 2023)

El API se alineará con esta lista. No refleja el estado actual; el avance se registra en el documento privado del equipo.

| Riesgo | Medida prevista |
|---|---|
| API1 Autorización a nivel de objeto | Comprobar la pertenencia de cada recurso con una política única |
| API2 Autenticación rota | Límites de intentos, refresh, sesiones persistentes y mensajes uniformes |
| API3 Autorización a nivel de propiedad | DTO de entrada con lista blanca y DTO de salida sin campos internos |
| API4 Consumo ilimitado de recursos | Límites por ruta, paginación y canales basados en eventos |
| API5 Autorización a nivel de función | `@Auth(...roles)` en todas las funciones administrativas |
| API6 Flujos de negocio sensibles | Límites y verificación en reservas y cobros |
| API7 SSRF | Lista de destinos permitidos al integrar servicios externos |
| API8 Configuración incorrecta | `helmet`, CORS por entorno, configuración validada y revisión de la BD gestionada |
| API9 Gestión de inventario | Swagger y revisión periódica de endpoints |
| API10 Consumo inseguro de APIs | Validar las respuestas de Stripe, Facturapi y Expo Push |

---

## I. Verificación de configuración, repositorio y dependencias (2026-10-12)

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-20 | Base de datos gestionada: revisar la exposición de la API de datos del proveedor, activar políticas por fila en todas las tablas y limitar los permisos de los roles públicos | Crítico | S |
| DT-44 | Control de acceso por rol en los endpoints de métricas de la base de datos | Alto | S |
| DT-45 | Control de acceso por rol, validación de archivos y neutralización de fórmulas en las funciones de importación y exportación | Alto | M |
| DT-46 | Respaldos propios del proveedor activados, copia periódica cifrada y restauración probada | Alto | M |
| DT-47 | Repositorio: activar secret scanning con push protection, Dependabot y protección de ramas (`develop` y `main`); unificar los dos workflows de CodeQL | Alto | S |
| DT-48 | Revisar el historial de git en busca de claves y rotar las que corresponda | Alto | S |
| DT-49 | Dependencias: actualizar las vulnerables, retirar las que no se usan (`ioredis`, `mysql2`, `typeorm`) y fijar Node LTS en `engines`, `.nvmrc` y CI | Alto | S |

Otras observaciones de calidad: TypeScript sin modo estricto (`noImplicitAny` desactivado), reglas de ESLint relajadas, errores de tipos pendientes, README sin guía de arranque y residuos de configuración (DT-40, DT-42).

---

## J. Web (Next.js)

Revisión de los archivos clave de la web y de un diagnóstico de calidad. Lo que requiere más archivos se marca **por verificar**.

### J.1 Estado observado

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-W25 | Gestión de secretos de la web: valores solo por entorno, sin respaldos en el código, y rotación | Crítico | S |
| DT-W26 | Rutas internas de la web (`app/api/*`): verificación de sesión y rol en cada una, validación de entrada y protección del cron; o migración al API | Crítico | M |
| DT-W03 | Unificar el acceso a datos en el API y compartir un solo esquema | Alto | L |
| DT-W27 | Conexión a la base de datos con validación del certificado y rol de mínimo privilegio | Alto | S |
| DT-W01, DT-W02 | Sesión: cookie `httpOnly` emitida por el servidor, autorización verificada en servidor y comprobación de revocación | Alto | M |
| DT-W28 | Cierre de sesión por inactividad: corregir la ruta y limpiar la sesión | Alto | S |
| DT-W04, DT-W05 | Alinear el contrato web y API (OpenAPI como fuente) y un cliente de API único que adjunte la sesión | Alto | M |
| DT-W29 | Un solo mecanismo de respaldo, en el API | Medio | M |
| DT-W30 | Un solo proveedor de sesión (hoy hay dos) | Medio | M |
| DT-W31 | Herramientas: instalar y configurar ESLint, fijar un gestor de paquetes, quitar dependencias sin uso, reemplazar `xlsx` y añadir scripts de pruebas | Alto | M |
| DT-W06 | Retirar el cliente de Supabase y los restos de la migración | Medio | S |
| DT-W32 | Añadir CSP y `Permissions-Policy`; limpiar dominios de desarrollo | Bajo | S |
| DT-W33 | Lógica del respaldo automático: unificarlo en el API (DT-W29) | Alto | S |
| DT-W07 | Registro en consola por entorno | Bajo | S |

### J.2 Arquitectura y patrones (web)

| ID | Observado | Objetivo | Sev | Esf |
|---|---|---|---|---|
| DT-W08 | 101 llamadas `fetch` directas dentro de páginas y componentes (más 136 `any`, 43 usos de `localStorage` y 77 `console.*`), con la URL base repetida (`RAW_API_BASE`, `API_URL`, `BACKEND_URL`, `apiUrl`, `BASE_URL`) aunque existe `lib/api.ts` | Una capa de datos: cliente de API único (patrón Adapter/Gateway), un hook por recurso y React Query para el estado de servidor | Alto | L |
| DT-W09 | Archivos muy grandes: `predictive/page copy.tsx` 1 719 líneas (copia muerta), `db-performance` 1 507, `lib/public.schema.ts` 1 218, `Importpreviewmodal` 969, `styles/globals.css` 826, `checkout` 787 y la página admin de `menu` 742; lógica mezclada con la vista y 342 estilos en línea | Componentes pequeños, hooks por funcionalidad, carpetas `features/<modulo>/{components,hooks,services,types}` y la lógica de negocio fuera del JSX | Medio | L |
| DT-W10 | Constantes duplicadas: los mapas de roles aparecen en 8 archivos (login, layout, `lib/session.ts`, `/api/auth/me`, `useRedirect`, `proxy.ts`, la página de usuarios y `config/roles.config.ts`); la lógica del tema está en `ConditionalNavbar` y en `ThemeToggle` | Una única fuente de roles (`config/roles.config.ts`), un solo proveedor de tema | Medio | S |
| DT-W11 | Estado: mezcla de almacenamiento local directo (`dataService`), un slice de autenticación y estado local en cada página | React Query para datos del servidor y Zustand para estado de interfaz, igual que la app móvil; un único proveedor de sesión | Medio | M |
| DT-W12 | Residuos: `page copy.tsx`, `check_backups.ts` en la raíz, componentes de Firebase comentados y marcados como obsoletos, `handlerEmailActions.tsx`, `any` en cuerpos de petición (`const body: any`) | Borrarlos, tipar con los DTO generados desde el OpenAPI | Bajo | S |
| DT-W13 | Calidad: sin quality gate | Mismas reglas que el móvil: TypeScript estricto, ESLint (`no-explicit-any`, reglas de Next y de accesibilidad), Prettier, `husky` y `commitlint`, SonarCloud | Medio | M |

**Patrones recomendados para la web:** Adapter/Gateway (cliente de API), Facade (`useCheckout()` que encadena carrito, pedido, pago y confirmación, igual que la app), Observer (suscripción a eventos de pedidos), contenedor y presentación (separar lógica de vista), y composición de componentes sobre un sistema de diseño.

### J.3 Sistema de diseño y paleta de colores

El problema de partida es que no hay una paleta única. Hay que medir antes de decidir (ver los comandos del apartado de datos que faltan).

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-W14 | **Tokens de diseño:** paleta definida una sola vez como variables CSS y en el tema de Tailwind, con nombres semánticos (`brand`, `surface`, `text`, `muted`, `success`, `warning`, `danger`, `info`) y escalas de claro y oscuro; prohibir colores hexadecimales y valores arbitrarios (`bg-[#...]`) fuera de ese archivo con una regla de ESLint | Medio | M |
| DT-W15 | **Tipografía, espaciado, radios y sombras** también como tokens; una familia tipográfica cargada con `next/font` | Medio | S |
| DT-W16 | **Componentes base** (Button, Input, Select, Modal, Table, Badge, Card, Toast, EmptyState, Skeleton) con variantes; las páginas los usan en lugar de repetir clases | Medio | L |
| DT-W17 | **Accesibilidad:** contraste mínimo WCAG AA (4,5 a 1 en texto), foco visible, etiquetas en formularios, navegación por teclado, `alt` en imágenes. Verificar con axe y Lighthouse | Medio | M |
| DT-W18 | **Modo claro y oscuro** coherente: cada token con su valor para ambos temas | Bajo | S |
| DT-W19 | **Documentación visual:** Storybook (o una página interna) con tokens y componentes | Bajo | M |

#### Medición de la paleta (12 de octubre)

| Dato | Resultado | Lectura |
|---|---|---|
| Tokens definidos | 7: `brand` (#e85d04), `surface`, `text`, `text-sec`, `text-muted`, `border`, `secondary`, cada uno con su valor para tema oscuro | Buena base, pero **no hay tokens de estado** (éxito, advertencia, peligro, información) ni escala de neutros |
| Uso de tokens | `bg-surface` 659, `text-muted` 570, `text-brand` 258, `bg-brand` 212, `border-brand` 153, `bg-background` 58 | `background` no figura entre las variables definidas: **por verificar** si esa clase tiene efecto |
| Colores de Tailwind usados directo | 19 familias: `red` 388, `emerald` 303, `gray` 143, `amber` 140, `blue` 84, `green` 49, `purple` 48, `orange` 26, `yellow` 21, `sky` 14, `violet` 12, `slate` 9, `zinc` 6... | Los estados se están resolviendo con colores sueltos: rojo (peligro), esmeralda y verde (éxito, duplicado), ámbar (advertencia) |
| Colores hexadecimales | Más de 40 distintos. Hay 3 naranjas (`#e85d04` 15, `#f97316` 22, `#d97706` 5), 4 rojos (`#ef4444`, `#dc2626`, `#c0392b`, `#fca5a5`), 5 o más grises (`#64748b` 28, `#475569`, `#334155`, `#94a3b8`, `#7f8c8d`) y 2 morados (`#7c3aed`, `#8b5cf6`) | Falta una escala única; el naranja de marca existe pero se usa otro más veces |
| Valores arbitrarios de Tailwind | 803; estilos en línea 342; clases `dark:` 69 más los tokens que cambian en oscuro | No se usa la escala de diseño y hay dos mecanismos de modo oscuro |
| Hoja de estilos global | `styles/globals.css` con 826 líneas | Candidata a dividirse en tokens, base y componentes |

**Contraste (WCAG AA exige 4,5 a 1 en texto normal y 3 a 1 en texto grande):**

| Combinación | Contraste | Resultado |
|---|---|---|
| `text` sobre blanco | 18,5 a 1 | Cumple |
| `text-sec` sobre blanco | 6,3 a 1 | Cumple |
| **`text-muted` sobre blanco (570 usos)** | **2,8 a 1** | **No cumple** |
| **`text-muted` oscuro sobre fondo oscuro** | **3,2 a 1** | **No cumple** |
| `brand` como texto sobre blanco | 3,5 a 1 | No cumple en texto normal; sirve en texto grande |
| Texto blanco sobre botón `brand` | 3,5 a 1 | No cumple en texto normal; usar texto grande y en negrita o un naranja más oscuro |
| `brand` sobre fondo oscuro | 5,0 a 1 | Cumple |
| `#f97316` sobre blanco | 2,8 a 1 | No cumple |

**Propuesta de tokens** (conservando el naranja de marca y los neutros cálidos que ya existen): `brand` con variantes `hover`, `active` y `soft`; neutros `text`, `text-sec`, `text-muted` (oscurecer a unos 4,6 a 1), `border`, `surface`, `surface-alt`, `background`; estados `success` (emerald), `warning` (amber), `danger` (red) e `info` (blue), cada uno con `base`, `soft` (fondo) y `strong` (texto); una paleta corta de 6 colores para gráficos (Recharts). Se eliminan `gray`, `slate`, `zinc`, `green` y los hexadecimales sueltos.

### J.4 Pruebas y operación (web)

**No hay ninguna prueba ni configuración de pruebas (confirmado):** no hay archivos de prueba, el `package.json` no tiene script ni librerías de pruebas y `lint` apunta a un ESLint que no está instalado.

| ID | Tipo | Qué cubre | Herramienta |
|---|---|---|---|
| DT-W20 | Unitarias | Utilidades, hooks y reglas (totales, roles, formatos) | Vitest o Jest |
| DT-W20 | Componentes | Formularios, tablas y modales con estados de carga y error | Testing Library |
| DT-W20 | Contrato | Que las llamadas coincidan con el OpenAPI | Tipos generados y MSW |
| DT-W20 | Punta a punta | Iniciar sesión, pedido, checkout, reservas, panel de admin | Playwright |
| DT-W20 | Accesibilidad | Contraste, etiquetas y teclado | axe-core en Playwright |
| DT-W20 | Visual | Cambios no deseados en la interfaz | Capturas de Playwright o Storybook |
| DT-W20 | Seguridad | Cabeceras, rutas protegidas, XSS básico | Playwright y OWASP ZAP (baseline) |
| DT-W20 | Rendimiento | Núcleo web (LCP, CLS, INP) y tamaño del bundle | Lighthouse CI |

| ID | Mejora | Sev | Esf |
|---|---|---|---|
| DT-W21 | Cabeceras de seguridad (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) en `next.config.js` | Medio | S |
| DT-W22 | Sentry en la web con filtrado de datos sensibles, igual que la app, y análisis de rendimiento | Medio | S |
| DT-W23 | CI de la web: lint, tipos, pruebas, `next build`, CodeQL, Gitleaks y Dependabot; previsualizaciones por PR en Vercel | Alto | M |
| DT-W24 | Variables `NEXT_PUBLIC_*` revisadas: solo valores realmente públicos (URL del API, clave publishable de Stripe) | Medio | S |

## K. Manejo de errores y resiliencia (API, web y móvil)

El objetivo es que **todo error tenga un tratamiento definido**, no solo los básicos (404 y 500). Cada fallo debe tener un código estable, un mensaje útil en español para la persona, un detalle técnico solo en los registros y una acción posible (reintentar, corregir, volver o contactar a soporte con un código de referencia).

### K.1 Contrato único de error (API)

```json
{
  "statusCode": 409,
  "code": "RESERVATION_CONFLICT",
  "message": "La mesa ya está reservada en ese horario.",
  "details": [{ "field": "fechaHora", "message": "Elige otro horario" }],
  "requestId": "b3f1c2...",
  "timestamp": "2026-10-12T20:15:00Z",
  "path": "/reservations"
}
```

Reglas: nunca devolver `err.message`, trazas ni textos de la BD; `requestId` en cada respuesta y en los registros; los códigos (`code`) viven en un catálogo compartido (OpenAPI) que la web y la app traducen a mensajes en un solo lugar.

### K.2 Catálogo de situaciones a contemplar

| Situación | API | Web | Móvil |
|---|---|---|---|
| **400 y 422** validación o regla de negocio | `ValidationPipe` con `exceptionFactory` que devuelve errores por campo; reglas de negocio con código propio (cantidad inválida, fuera de horario) | Error bajo cada campo, sin perder lo escrito | Igual; deshabilitar el envío hasta corregir |
| **401** sin sesión, expirada o revocada | Códigos `SESSION_EXPIRED` y `TOKEN_REVOKED` | Limpiar la sesión, avisar y redirigir al login con `callbackUrl` | Refresh o login; **conservar el pedido en curso** en Zustand |
| **403** sin permiso | `FORBIDDEN_ROLE` | Página `forbidden` clara, sin redirecciones silenciosas | Mensaje y ocultar la acción |
| **404** ruta o recurso inexistente | JSON uniforme para ruta desconocida y `NotFoundException` para recursos (no responder 200 con `null`) | `not-found.tsx` global y por sección, `notFound()` en rutas dinámicas (`producto/[id]`, `categoria/[slug]`), `noindex` | Pantalla de recurso no disponible con botón de volver |
| **405, 406, 413, 415** método, formato o tamaño | Estados correctos y mensaje claro (importaciones de 5 y 10 MB) | Mensaje específico al subir archivos | Igual |
| **409** conflicto | Mapear errores de Postgres: `23505` (duplicado) a 409, `23503` (clave foránea) a 409 o 422, `23514` a 422; doble reserva; transición de estado inválida; pedido ya pagado | Mensaje accionable ("ese correo ya está registrado") | Igual |
| **429** demasiadas peticiones | `Retry-After` y código `RATE_LIMITED` | Mostrar la espera y bloquear el botón | Igual con retroceso exponencial |
| **500** error interno | Filtro global: registra con `requestId`, responde genérico | `error.tsx` por sección y `global-error.tsx`, con "Reintentar" y código de referencia | Pantalla de error, Sentry y reintento |
| **502, 503 y 504** dependencia caída (Stripe, Facturapi, Supabase, Expo Push, BD) | Tiempos de espera, reintentos acotados y modo degradado; `/health` con detalle | Mensajes específicos ("el pago no está disponible") | Igual |
| **Mantenimiento** | 503 con `Retry-After` por bandera | Página `/maintenance` (el proxy ya la referencia) | Aviso con reintento automático |
| **Red:** sin conexión, DNS, CORS, petición abortada | Cabeceras CORS correctas en errores | Detector online y offline, mensaje claro | NetInfo, banner "sin conexión", cola de acciones seguras; no perder el pedido |
| **Tiempo de espera** | Interceptor de timeout y timeouts en terceros | Reintento con retroceso y botón manual | Igual |
| **Pagos** (tarjeta rechazada, fondos insuficientes, vencida, 3DS requerido o fallido, intento cancelado, pago duplicado, webhook retrasado o perdido) | Mapear códigos de Stripe a códigos propios; idempotencia; conciliación si el webhook no llega | Mensaje con el motivo y opción de otro método | HU-05: el pago rechazado no crea un pedido confirmado y muestra el motivo al Cajero |
| **Facturación** (RFC inválido, timbrado fallido) | Códigos y reintento controlado | Mensaje por campo | — |
| **Archivos** (formato, vacío, filas con error) | Reporte por fila | Resumen de errores descargable | — |
| **Tiempo real** (SSE o WebSocket cae) | Latidos y reanudación | Reconexión con retroceso y estado "reconectando" | Reconexión y `refetch` de React Query (HU-06) |
| **Push** (permiso denegado, `DeviceNotRegistered`, sin red) | Borrar tokens inválidos al leer los recibos | — | Aviso con enlace a ajustes (HU-07) |
| **Errores no capturados** | `unhandledRejection` y `uncaughtException` con cierre ordenado y registro | Error boundaries por sección y `window.onerror` | Error boundary y Sentry |
| **Carga y vacío** | — | `loading.tsx`, esqueletos y estados vacíos con acción; nunca una pantalla en blanco | Igual |
| **Sesión inactiva** | — | Aviso previo al cierre por inactividad (15 min) y conservar borradores | Bloqueo con biometría opcional |
| **Imágenes y recursos rotos** | — | Imagen de respaldo en `SmartImage` | Igual |

### K.3 Estado observado

| ID | Observado | Objetivo | Sev | Esf |
|---|---|---|---|---|
| DT-E01 | API: sin filtro global de excepciones y sin `ValidationPipe`; `catch` con mensaje fijo (por ejemplo, `sign-up` responde "El email ya existe" ante cualquier fallo); los 404 y 405 salen con el formato por defecto de Nest en inglés | Filtro global y contrato de K.1 | Alto | M |
| DT-E02 | API: los errores de Postgres no se traducen (`23505`, `23503`...) y terminan como 500 | Tabla de mapeo de códigos de BD a estados HTTP | Medio | S |
| DT-E03 | Las rutas internas de la web devuelven al cliente el mensaje de error original | Mensajes genéricos con código y registro interno | Alto | S |
| DT-E04 | Web: `lib/api.ts` ya tiene `APIError` (buen comienzo) pero usa `any`, no maneja 401 (no limpia ni redirige), ni red caída, ni tiempos de espera, ni 429, ni 5xx, y los 101 `fetch` directos lo ignoran. `useFetch` pierde el detalle (muestra "Error 404") y no envía el token | Cliente único con interceptores y errores tipados | Alto | M |
| DT-E05 | Web: **verificado en el árbol:** existen `error.tsx`, `not-found.tsx`, `loading.tsx` y las páginas `forbidden`, `unauthorized` y `maintenance`. **Faltan** `global-error.tsx`, `loading.tsx` y `error.tsx` por sección (dashboard, menú, pedido) y un `not-found.tsx` por sección. **Por verificar** el contenido de cada una y el uso de `notFound()` en rutas dinámicas | Completar los archivos que faltan y reutilizar un `StatusPage` (DT-N10) | Medio | M |
| DT-E06 | Web: `catch` que solo hacen `console.error` o se tragan el error (`AuthProvider`, `IdleLogout`, `hydrateSession`), 77 llamadas a `console.*` y errores avisados con `alert()` | Notificaciones (toasts) y registro con Sentry | Medio | M |
| DT-E07 | Móvil: aún no hay criterios de errores en las HU (red, 401, error boundary, reconexión del stream, permiso de push) | Incluirlos en HU-01, 05, 06 y 07 (K.2) | Medio | M |
| DT-E08 | Sin `requestId` ni Sentry en el API y la web | Correlación y alertas (DT-22, DT-W22) | Alto | M |
| DT-E09 | Sin catálogo de códigos de error compartido | Catálogo en el OpenAPI y mensajes centralizados en español | Medio | S |
| DT-E10 | Sin pruebas de rutas de error | Casos 4xx y 5xx en las pruebas de autorización e integración, pruebas de error boundaries y fallos simulados (BD caída, Stripe con 500, tiempos de espera) | Alto | M |

---

## L. Defensa en profundidad y resistencia a ingeniería inversa

**Premisa honesta:** el código que llega al navegador o al teléfono **siempre se puede leer y modificar**; ninguna ofuscación lo impide. Por eso la estrategia es doble: (1) que en el cliente **no haya nada valioso que encontrar** (sin secretos, sin reglas de permisos, sin datos de más) y (2) que **todo lo que un atacante intente con el cliente lo rechace el servidor**. La ofuscación y el pinning solo suben el costo, no sustituyen lo anterior.

| ID | Amenaza | Medida | Dónde | Cuándo |
|---|---|---|---|---|
| DT-D01 | Robo o abuso de secretos | Ningún secreto en `NEXT_PUBLIC_*`, en el bundle de la web ni en el APK (solo URL del API y la clave publishable de Stripe). Gitleaks sobre el repositorio y sobre el bundle exportado. Secretos solo en variables de la plataforma, separados por entorno, rotación calendarizada y claves restringidas (Stripe) | Todos | Antes de producción |
| DT-D02 | Falsificación de tokens | Firmar los JWT con un algoritmo asimétrico (EdDSA o RS256): el API guarda la clave privada y la web y la app solo la pública (JWKS). Así, comprometer la web no permite emitir tokens. Mientras tanto, un secreto único y aleatorio, rotado | API y web | Antes de producción (secreto), después (asimétrico) |
| DT-D03 | Robo de sesión por XSS | Token en cookie `httpOnly`, `Secure` y `SameSite`, vida corta con refresh rotatorio, CSP estricta con nonce, sin `dangerouslySetInnerHTML` sin sanear, y `sign-out` que revoque en el servidor | Web | Antes de producción |
| DT-D04 | CSRF y clickjacking | Verificar `Origin` en las rutas con cookie, `SameSite`, y `frame-ancestors 'none'` (hoy ya hay `X-Frame-Options`) | Web | Antes de producción |
| DT-D05 | Ingeniería inversa del front | `productionBrowserSourceMaps: false` (confirmar), `poweredByHeader: false`, quitar `console.*` en producción (`compiler.removeConsole`), subir los source maps solo a Sentry, y no dejar rutas, endpoints ni claves "de prueba" en el código | Web | Antes de producción |
| DT-D06 | Autorización saltada desde el cliente | Toda decisión de permisos en el servidor (guard por rol y por propiedad del recurso); ocultar un botón o una ruta no es seguridad. Validar sesión también dentro de cada handler y no solo en el `proxy`, como defensa en profundidad | API y web | Antes de producción |
| DT-D07 | Fuerza bruta, relleno de credenciales y bots | Límite por IP y por cuenta, bloqueo temporal, mensajes uniformes, y Turnstile o reCAPTCHA en login, registro, restablecer contraseña y reservas públicas | API y web | Antes de producción |
| DT-D08 | Enumeración y extracción masiva de datos | Paginación con tope máximo, respuestas con solo los campos necesarios (DTO de salida), mismos mensajes para "no existe" y "no tienes permiso" cuando convenga, y alertas por picos de 401, 403, 404 y 429. Los UUID no sustituyen la autorización | API | Antes de producción |
| DT-D09 | Inyección y datos malformados | `ValidationPipe` con lista blanca, consultas parametrizadas (ya se usan), límites de tamaño de cuerpo y archivos, validación de contenido de archivos y neutralización de fórmulas en CSV y Excel | API | Antes de producción |
| DT-D10 | Webhooks falsificados o repetidos | Firma verificada (ya), idempotencia por `event.id`, y respuesta correcta para que Stripe reintente solo lo que debe | API | Antes de producción |
| DT-D11 | Acceso directo a la base de datos | Políticas por fila en todas las tablas, permisos mínimos para los roles públicos del proveedor, rol de mínimo privilegio para el API, SSL con verificación del certificado, y datos personales sensibles cifrados a nivel de aplicación o fuera de la BD | Supabase y API | Antes de producción |
| DT-D12 | Pérdida o filtración de respaldos | Respaldos cifrados, en un destino privado y probados con una restauración real | Supabase y API | Antes de producción |
| DT-D13 | App móvil: lectura del APK y robo de sesión | Tokens en `expo-secure-store` (Keystore), `allowBackup` desactivado, tráfico solo HTTPS, minificación con R8 y ProGuard y reducción de recursos (`expo-build-properties`), Gitleaks sobre el bundle (ya previsto en HU-05), bloqueo de capturas en pantallas de cobro (`expo-screen-capture`), bloqueo biométrico opcional y sesiones cortas | Móvil | En los sprints de la app |
| DT-D14 | App móvil: interceptación del tráfico | Certificate pinning con pines de respaldo y plan de rotación (opcional: puede dejar la app sin conexión si se rota mal el certificado); detección de root y de depuración con valor limitado | Móvil | Después |
| DT-D15 | Cadena de suministro | Ramas protegidas, 2FA obligatorio en la organización, permisos mínimos del `GITHUB_TOKEN`, acciones fijadas por SHA, Dependabot, CodeQL, Gitleaks, `pnpm install --frozen-lockfile`, y rotación de `EXPO_TOKEN` y `SENTRY_AUTH_TOKEN` | GitHub | Antes de producción |
| DT-D16 | Detección y respuesta | Sentry en API, web y app; bitácora de auditoría (la tabla `logs_auditoria` ya existe) para inicios de sesión, cambios de rol, pagos y respaldos; alertas; un runbook de incidentes (rotar secretos, revocar sesiones, bloquear, restaurar) y un `security.txt` | Todos | Antes de producción |
| DT-D17 | Verificación de todo lo anterior | Pruebas de autorización automatizadas, OWASP ZAP (baseline) y plantillas de Nuclei contra staging, y una prueba de penetración corta antes de entregar al cliente. Solo sobre sistemas propios | Todos | Antes de producción |

---

## M. Plataformas y planes gratuitos: qué impide producción

Verificado el 12 de octubre de 2026 en la documentación y la página de precios de cada proveedor. **Confirma los precios en cada sitio antes de presupuestar.**

| Plataforma | Plan declarado | Límite relevante | Consecuencia para El Quijote | Acción |
|---|---|---|---|---|
| Vercel (web) | Hobby | La documentación y las guías de uso justo restringen Hobby a **uso personal y no comercial**. Los cron jobs solo pueden correr **una vez al día**, con precisión de ±59 minutos | Un sistema para un cliente es uso comercial. El respaldo automático de la web depende de un cron | Pasar a Pro (20 USD al mes por usuario, según su página de precios) o cambiar de proveedor |
| Render (API) | Gratuito | Se **duerme tras 15 minutos sin tráfico**, puede reiniciarse en cualquier momento, el sistema de archivos es efímero, y su documentación indica que **no debe usarse para producción** | Se pierden las sesiones (están en memoria) y los respaldos locales, el stream en tiempo real se corta, el cron del API no corre dormido, y la primera petición tras la pausa es lenta | Pasar a un plan de pago (que no se duerma); confirmar el precio en Render |
| Supabase (BD) | Gratuito | El proyecto se **pausa tras 1 semana sin actividad**, **sin respaldos automáticos**, 500 MB de base de datos y 1 GB de almacenamiento | Una semana tranquila deja el sistema caído hasta reactivarlo a mano; y hoy no existe ninguna copia de seguridad del proveedor | Pasar a Pro (25 USD al mes por organización; incluye respaldos diarios con 7 días de retención y sin pausa) |

**Lógica del cron de respaldo (DT-W33):** `app/api/cron/backups` solo ejecuta si la hora actual coincide con `backupTime` (por defecto "23:00"), pero en Vercel el cron está programado a las 02:00 UTC y la hora del servidor es UTC. Si el ajuste no se cambió a las 02:00, el respaldo **se omite siempre**; y con la precisión de ±59 minutos de Hobby, aun configurándolo podría caer en otra hora. Se resuelve con el mecanismo único de respaldo en el API (DT-W29, DT-46).

**Renombre de los repositorios:** las direcciones de despliegue (`*.vercel.app` y `*.onrender.com`) salen del nombre del proyecto o del servicio, no del repositorio, así que no cambian. GitHub redirige el nombre anterior y las integraciones suelen seguir al repositorio por su identificador, pero conviene verificar que cada plataforma sigue conectada y que un `push` dispara el despliegue (ver Pendientes). Hay que actualizar los `remote` locales, los workflows, los README y cualquier enlace que mencione el nombre anterior.

---

## N. Reducción de archivos y código duplicado (web)

El árbol compartido tiene unos 300 archivos (estimación). Hay margen para quitar entre 70 y 100 sin perder funciones. **Los números son estimaciones: se confirman con `knip` antes de borrar** (ver comandos más abajo).

| ID | Candidato | Archivos hoy | Resultado | Ahorro aprox. |
|---|---|---|---|---|
| DT-N01 | Volcados y archivos de trabajo en la raíz: `diag-web.txt`, `dump-web.txt`, `dump-web-archivos.txt`, `middleware.ts.bk`, `page copy.tsx`, `check_backups.ts`, `delete_cron_date.cjs` | 7 | Borrarlos y ver el apartado sobre `.gitignore` | 7 |
| DT-N02 | `setup_settings.cjs`, `.js` y `.ts` (tres versiones del mismo script) | 3 | Uno solo en `scripts/`, o eliminarlo | 2 a 3 |
| DT-N03 | Acceso a la BD desde la web: `lib/db.ts`, `lib/schema.ts`, `lib/public.schema.ts`, `drizzle/*` (3), `utils/supabase/*` (3) | 10 | Se eliminan al migrar la lógica al API (DT-W03) | 10 |
| DT-N04 | Rutas internas de la web que acceden a la BD (administración, respaldos, configuración e inventario) | 17 | Se sustituyen por un solo proxy hacia el API (BFF) y las rutas de autenticación | 11 a 13 |
| DT-N05 | Redux: `store.ts`, `store/index.ts`, `store/slices/authSlice.ts`, `hooks/useAppSelector.ts`, más `@reduxjs/toolkit` y `react-redux` | 4 | Un solo proveedor de sesión (`AuthProvider`) | 4 |
| DT-N06 | Botones y tipos: `components/Button.tsx`, `components/ui/Button.tsx`, `types/ButtonProps.tsx`, `types/ui.ts`, `types/index.ts` | 5 | Un `Button` en `components/ui` con sus tipos dentro | 3 a 4 |
| DT-N07 | Tema y proveedores: `ThemeProvider`, `DesignSystemProvider`, `AppProviders`, `hooks/useTheme`, `ThemeToggle`, y `next-themes` sin uso | 5 | Un proveedor de tema y un `ThemeToggle` | 2 a 3 |
| DT-N08 | Hooks de pantalla: `useMediaQuery`, `useBreakpoint`, `useResponsiveNavbar` | 3 | Un solo `useMediaQuery` | 2 |
| DT-N09 | Barras y diseños: `Navbar`, `ConditionalNavbar`, `ClientLayoutWrapper`, `layout/Sidebar`, `admin/AdminSidebar`, tres archivos `config/navigation/*` | 8 | Una barra, una barra lateral y un solo `navigation.ts` por rol | 4 |
| DT-N10 | Páginas de estado: `error`, `not-found`, `forbidden`, `unauthorized` y `maintenance`, cada una con su `.module.css` | 10 | Un componente `StatusPage` con Tailwind y cinco archivos delgados (se añade `global-error.tsx`) | 4 a 5 |
| DT-N11 | Páginas estáticas de `(public)`: `about`, `ayuda`, `condiciones`, `corporativo`, `devoluciones`, `privacidad`, `seguridad` | 7 | Una ruta `[slug]` con un archivo de contenido (y `InfoPageLayout`, que ya existe) | 5 |
| DT-N12 | Datos de ejemplo (`*Mock*`, `mockData`, `promotions`, `restaurantData`) | 15 | **Primero confirmar qué pantallas muestran datos simulados** (ver comando). Si son reales, borrarlos; si no, conectar al API | 10 a 15 |
| DT-N13 | `features/dashboard/cliente/*` (9 archivos) no tiene ruta `app/dashboard/cliente` | 9 | Confirmar con `knip`; si está muerto, borrarlo | 0 a 9 |
| DT-N14 | Componentes de administración muy pequeños (modales, tarjetas, filas: unos 60) | 60 | Fusionar los de menos de 40 líneas en el archivo que los usa, un `FormModal` genérico, y un solo `OrderModal`, `InvoiceModal` y `SupplierModal` | 10 a 15 |
| DT-N15 | Archivos JavaScript en un proyecto TypeScript (`MolinoAnimado.jsx`, `Plato.jsx`) y `AboutSection.ts` junto a `about/AboutSection.tsx` | 3 | Convertir y quitar el duplicado | 1 |
| DT-N16 | Documentos de trabajo en el repo (`requisitos funcionales.md`, `workplan.md`, `docs/diagnostico-frontend.md`) | 3 | Mover a una carpeta `docs/` o a la wiki | 0 a 2 |
| DT-N17 | Dependencias sin uso: `firebase`, `firebase-admin`, `bcrypt`, `cloudinary-core`, `cloudinary-react`, `next-themes`, `@supabase/supabase-js`, `@types/grecaptcha` | 8 paquetes | Desinstalarlas (menos superficie de ataque y menos bundle) | — |

**Reglas para que no vuelva a crecer:** estructura `features/<modulo>/{components,hooks,api,types}` y nada de `types/` global salvo lo realmente compartido; un componente solo se extrae si se usa en dos o más sitios; un solo cliente de API; regla de ESLint contra importaciones circulares y archivos sin uso en CI (`knip`).

**Comandos (pwsh, en la raíz del repo web; el resultado va a un archivo, no a la pantalla):**

```powershell
npx knip --reporter compact *> knip-web.txt          # archivos, exportaciones y paquetes sin uso
npx jscpd app components features hooks lib --min-lines 20 --reporters console *> jscpd-web.txt   # código duplicado
npx madge --circular --extensions ts,tsx app components features hooks lib *> madge-web.txt        # dependencias circulares
# ¿Qué pantallas usan datos simulados?
Get-ChildItem -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'node_modules|\.next' } |
  Select-String -Pattern "from ['""].*(Mock|mockData|restaurantData|promotions)" |
  ForEach-Object { '{0}:{1}: {2}' -f $_.Path.Replace((Get-Location).Path + '\',''), $_.LineNumber, $_.Line.Trim() } *> mocks-web.txt
```

Los mismos `knip` y `jscpd` sirven para el repo del API (`src`).

**Los volcados que se generan en los repositorios (`dump-*.txt`, `diag-*.txt`, `salidas*.txt`, `endpoints-raw.csv`, `openapi.json`) no deben subirse nunca**, porque son públicos y contienen código y datos de configuración. Agrégalos a `.gitignore` en el API y en la web y confirma con `git ls-files` y `git log --all -- <archivo>` que nunca se confirmaron.

---

## O. Optimización

| ID | Capa | Observado o riesgo | Mejora | Cómo medir | Esf |
|---|---|---|---|---|---|
| DT-O01 | Web | 101 `fetch` en el cliente; páginas de más de 700 líneas con `use client`; datos que podrían leerse en el servidor | Componentes de servidor para lecturas, caché de Next, React Query para el estado de cliente, y dividir páginas | `next build` (tamaño por ruta), Lighthouse CI | L |
| DT-O02 | Web | Paquetes pesados (`recharts`, `xlsx`, `googleapis`, `firebase`, `cloudinary`) y 8 sin uso | Quitar los sin uso, importaciones dinámicas para gráficos e importación Excel, y dejar `googleapis` solo en el API | Analizador de bundle (`@next/bundle-analyzer`) | M |
| DT-O03 | Web | 803 valores arbitrarios de Tailwind y 342 estilos en línea; `globals.css` de 826 líneas | Tokens de diseño (sección J.3) y menos CSS por página | Tamaño de CSS en `next build` | M |
| DT-O04 | Web | `pg.Pool` con `max: 10` en funciones serverless (cada instancia abre hasta 10 conexiones) | Se elimina al sacar la BD de la web; mientras tanto, el pooler de transacciones de Supabase y `max: 1` | Conexiones activas en `pg_stat_activity` | S |
| DT-O05 | API | Render gratuito se duerme (primer acceso lento); las sesiones en memoria se pierden | Plan sin pausa; guardar el `tokenId` de sesión en una tabla de Postgres (sin costo extra) o en Redis | Tiempo de la primera petición tras inactividad | M |
| DT-O06 | API | 46 claves foráneas sin índice y 14 índices sin uso (Advisor de Supabase); listados sin tope de paginación | Índices en las claves usadas por filtros y uniones, paginación con límite máximo, y `EXPLAIN ANALYZE` de las consultas del dashboard | `pg_stat_statements` (consultas más costosas) | M |
| DT-O07 | API | Los respaldos arman un JSON con todas las tablas en memoria | Exportar por lotes con flujo (stream) y comprimir | Memoria del proceso durante un respaldo | M |
| DT-O08 | API | El stream de pedidos consulta la BD cada 30 s por conexión | Eventos (sección E) y un tope de conexiones por usuario | Consultas por minuto con N clientes | M |
| DT-O09 | API | Menú y mesas se leen en cada visita | Caché con invalidación al editar el menú, `ETag` y compresión | Tiempo de respuesta antes y después | S |
| DT-O10 | BD | 500 MB de límite en el plan gratuito; los respaldos JSON ocupan almacenamiento | Retención limitada de respaldos y archivado fuera de la BD | Tamaño por tabla | S |

**Medición (ejecuta y guarda el resultado en un archivo):**

```powershell
# Web
pnpm build *> build-web.txt                  # tamaño por ruta
npx lighthouse https://el-quijote.vercel.app --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=lighthouse-web.json --chrome-flags="--headless"
# API (contra staging, carga suave y solo lecturas)
npx autocannon -c 10 -d 20 https://<url-del-api>/menu *> carga-api.txt
```

```sql
-- Supabase, consultas más costosas (si pg_stat_statements está activo)
select left(query, 100) as consulta, calls, round(mean_exec_time::numeric, 1) as ms_medio, round(total_exec_time::numeric) as ms_total
from pg_stat_statements order by total_exec_time desc limit 15;
```

---

## Lo que ya funciona bien

Cálculo del monto de pago en el servidor, verificación de firma en el webhook, idempotencia en el intento de pago, contraseñas con bcrypt, consultas parametrizadas con Drizzle, tokens con revocación, límite global de peticiones y configuración fuera del repositorio.
