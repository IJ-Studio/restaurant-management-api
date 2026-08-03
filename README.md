# El Quijote — Backend (API_restaurant_management)

Sistema de gestión para el restaurante "El Quijote". Proyecto integrador —
Ingeniería en Desarrollo y Gestión de Software.

## Integrantes

| Nombre completo | Matrícula | Grupo |
|---|---|---|
| Jose Alfredo Hernandez Arellano | 20230018 | B |
| Irving Aldahir Angeles Romero | 20230002 | B |

## Descripción del proyecto

Backend NestJS + TypeScript + Drizzle ORM sobre PostgreSQL (Supabase) para
el sistema de reservaciones, órdenes, menú, inventario, nómina, pagos y
facturación del restaurante. Dentro de este backend viven las **dos
soluciones oficiales de minería de datos** de la entrega:

1. **Clasificación — riesgo de no-show en reservaciones.** Random Forest
   implementado desde cero en `src/reservations/no-show/`
   (`random-forest.util.ts`), entrenado en vivo contra la base de datos
   real cada vez que se solicita. Traduce la probabilidad continua del
   modelo a 3 niveles de riesgo (Bajo/Medio/Alto) mediante los umbrales
   `UMBRAL_MEDIO`/`UMBRAL_ALTO` en `no-show.service.ts`.
2. **Clustering — segmentación de clientes.** K-Means con inicialización
   k-means++ implementado desde cero en `src/reports/segments/`
   (`kmeans.util.ts`), con semilla fija (mulberry32, seed=77) para que el
   resultado sea reproducible entre llamadas, y proyección PCA a 2D para
   graficar los clústeres.

Los notebooks de análisis (`no_show_prediction.ipynb`,
`customer_segmentation.ipynb`) y los artefactos entrenados viven **fuera**
de este repo, en la carpeta del proyecto (`06_Notebooks/` y `07_Modelos/`
en la estructura de entrega) — este backend no los carga ni depende de
ellos en tiempo de ejecución: reentrena ambos modelos en memoria contra la
base de datos real en cada solicitud.

## Stack

- NestJS 11 + TypeScript
- Drizzle ORM sobre PostgreSQL (Supabase)
- Autenticación JWT propia (`src/auth/`)
- Stripe (pagos), Facturapi (facturación), Google Drive (respaldo opcional)
- Sin dependencias externas para los modelos: Random Forest y K-Means están
  implementados desde cero, sin scikit-learn ni librerías de ML en el
  backend (Python + scikit-learn solo se usan en los notebooks, como
  validación offline — ver sección de umbrales en
  `no_show_prediction.ipynb` §8.2).

## Requisitos

- Node.js 20+ y `pnpm`
- Una base de datos PostgreSQL accesible (proyecto de Supabase, o
  cualquier Postgres 14+ para desarrollo local)
- Docker Desktop (opcional — solo si quieres reproducir la prueba de
  migraciones contra una base de datos vacía, ver más abajo)

## Instalación

```bash
pnpm install
cp .env.example .env
# Rellenar .env con credenciales reales (ver la sección de cada variable
# comentada dentro de .env.example). Nunca subir .env al repo.
```

## Orden de ejecución

1. **Aplicar el esquema a la base de datos** (si es una base nueva/vacía):
   ```bash
   npx drizzle-kit migrate
   ```
   o, alternativamente, aplicar los `.sql` de
   `src/database/drizzle/migrations/` directamente con `psql` en orden
   (`0000_loud_rattler.sql`, luego `0001_clean_ironclad.sql`) — así es como
   se probaron, ver "Restaurar la base de datos" abajo.

2. **(Opcional) Generar las reservaciones sintéticas** que usa el modelo
   de no-show (450 filas reproducibles, semilla fija):
   ```bash
   pnpm seed:synthetic-reservations -- --dry-run   # revisar antes sin escribir
   pnpm seed:synthetic-reservations -- --reset      # escribe en la BD real
   ```

3. **Levantar el servidor**:
   ```bash
   pnpm start:dev
   ```
   Escucha en `http://localhost:$PORT` (por defecto `10000`, ver
   `.env`/`src/main.ts`).

## Estructura del proyecto (carpetas relevantes)

```
src/
├─ reservations/
│  ├─ no-show/                 # Solución 1: clasificación (Random Forest)
│  │  ├─ random-forest.util.ts #   bosque + Gini balanceado + ROC-AUC, desde cero
│  │  ├─ no-show.service.ts    #   entrenamiento en vivo + umbrales de riesgo
│  │  └─ no-show.controller.ts #   endpoints (ver "Probar las soluciones")
│  └─ ...                      # CRUD de reservaciones
├─ reports/
│  ├─ segments/                 # Solución 2: clustering (K-Means)
│  │  ├─ kmeans.util.ts         #   k-means++ con semilla fija + PCA, desde cero
│  │  ├─ segments.service.ts    #   entrenamiento en vivo
│  │  └─ segments.controller.ts #   endpoint (ver "Probar las soluciones")
│  ├─ export/ · import/         # reportes de ventas (xlsx/csv/pdf)
│  └─ reports.module.ts
├─ database/
│  ├─ schema/public.schema.ts   # esquema Drizzle (fuente de verdad)
│  ├─ drizzle/migrations/       # migraciones versionadas + evidencia de prueba
│  └─ features/backups/         # respaldo automático de producción (JSON a Drive)
├─ auth/ · users/ · roles/      # autenticación, usuarios, roles
├─ menu/ · mesas/ · orders/     # operación del restaurante
├─ pagos/ · payroll/            # Stripe, nómina
└─ main.ts

scripts/
├─ generate-synthetic-reservations.ts  # genera las 450 reservaciones sintéticas
├─ export-anonymized-backup.ts         # respaldo anonimizado (ver abajo)
└─ test-migrations-empty-db.sh         # prueba las migraciones contra BD vacía (Docker)
```

## Restaurar la base de datos desde el respaldo

El respaldo anonimizado para la entrega vive en `02_Base_Datos/` (un nivel
arriba de este repo), en dos formatos equivalentes:

- `backup_anonimizado_<fecha>.json` — mismo formato que usa el respaldo
  automático de producción (`backups.service.ts`).
- `backup_anonimizado_<fecha>.sql` — mismo contenido en sentencias
  `INSERT`, listo para `psql`.

Es **distinto** del respaldo automático de producción: aquí se
pseudonimizan de forma determinista (mismo id → mismo pseudónimo siempre)
nombre/correo/teléfono de `users`, los datos de contacto de `reservaciones`,
y los campos fiscales (`rfc`, `razón social`, direcciones, IDs de Stripe)
de `clientes`/`facturas`/`perfiles_facturacion`/`direcciones_cliente`/
`metodos_pago_guardados`. El detalle completo del alcance y el método está
documentado en la cabecera de `scripts/export-anonymized-backup.ts`.

**Procedimiento (base de datos vacía → estado restaurado):**

```bash
# 1. Crear el esquema
psql "$DATABASE_URL" -f src/database/drizzle/migrations/0000_loud_rattler.sql
psql "$DATABASE_URL" -f src/database/drizzle/migrations/0001_clean_ironclad.sql

# 2. Cargar los datos anonimizados
psql "$DATABASE_URL" -f ../02_Base_Datos/backup_anonimizado_<fecha>.sql
```

El paso 1 ya se verificó de punta a punta contra un contenedor Postgres 16
vacío (`scripts/test-migrations-empty-db.sh` — evidencia completa en
`src/database/drizzle/migrations/EVIDENCIA_prueba_migraciones_2026-07-31.txt`):
56 tablas + 5 vistas, coincide exactamente con producción.

Para regenerar el respaldo anonimizado desde una base de datos real (no
desde el `.sql`/`.json` ya generados):

```bash
pnpm backup:anonimizado
```

## Probar las dos soluciones analíticas

Ambos endpoints requieren un usuario con rol `ADMIN`. Primero autenticarse:

```bash
curl -X POST http://localhost:10000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ejemplo.com","password":"<contraseña>"}'
# devuelve un access token (JWT) — usarlo como Bearer en las siguientes llamadas
```

**1. Clasificación — riesgo de no-show:**

```bash
# Métricas del modelo (precision/recall/F1/ROC-AUC/matriz de confusión,
# calculadas en el propio entrenamiento contra el set de prueba real)
curl http://localhost:10000/reservations/no-show-model/metrics \
  -H "Authorization: Bearer <token>"

# Riesgo de no-show de una reservación concreta
curl http://localhost:10000/reservations/<id-de-reservacion>/no-show-risk \
  -H "Authorization: Bearer <token>"
```

**2. Clustering — segmentación de clientes:**

```bash
curl http://localhost:10000/reports/customer-segments \
  -H "Authorization: Bearer <token>"
```

Ambos endpoints reentrenan el modelo correspondiente en cada llamada contra
los datos reales de la base — no hay artefacto pre-cargado en el backend
(el `.joblib` que generan los notebooks es solo para el análisis offline en
Python, documentado explícitamente como no usado en producción).

## Rama oficial de git

**`main`** — es la rama que se debe revisar. Se verificó que `main` ya
contiene todo lo que hay en `developer` (fusionada previamente) más las
correcciones de esta entrega (recall del modelo, script de datos
sintéticos, eliminación de módulos fuera de alcance, semilla de K-Means,
migración del esquema, etc.); `developer` quedó desactualizada respecto a
`main`, no al revés.

## Scripts útiles

| Comando | Qué hace |
|---|---|
| `pnpm start:dev` | Levanta el backend en modo desarrollo (watch) |
| `pnpm seed:synthetic-reservations -- --dry-run\|--reset` | Genera/reemplaza las 450 reservaciones sintéticas |
| `pnpm backup:anonimizado` | Genera el respaldo anonimizado (JSON + SQL) en `02_Base_Datos/` |
| `bash scripts/test-migrations-empty-db.sh` | Prueba las migraciones contra un Postgres 16 vacío (requiere Docker) |
| `pnpm lint` / `pnpm test` | Lint y pruebas unitarias |

## Seguridad

- `.env` nunca se sube al repo (ver `.gitignore`); `.env.example` solo
  tiene placeholders.
- Las credenciales que estuvieron expuestas antes de esta entrega
  (contraseña de base de datos, `SUPABASE_SERVICE_ROLE_KEY`,
  `JWT_SECRET`, llave de servicio de Google, `SESSION_SECRET`,
  `AIKIDO_TOKEN`) fueron rotadas; el historial de git se limpió con
  `git filter-repo`.
- **Limitación conocida, no corregida en esta entrega:** Row Level
  Security (RLS) está deshabilitado en las 56 tablas de `public` en
  Supabase. El backend en sí no depende de RLS (usa `SUPABASE_SERVICE_ROLE_KEY`
  desde el servidor, no la `anon key` desde el cliente), pero si en algún
  punto se usara `@supabase/supabase-js` directamente desde el frontend con
  la `anon key`, cualquiera podría leer o modificar cualquier fila sin pasar
  por este backend. Activar RLS sin políticas bloquearía todo acceso, así
  que no se aplicó sin revisión explícita — queda documentado como
  limitación pendiente.
