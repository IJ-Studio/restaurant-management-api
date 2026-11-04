# Cifrado de campos sensibles

Módulo: `src/common/cifrado/cifrado.ts` (AES-256-GCM con versión de clave, índice ciego HMAC-SHA256 y columna Drizzle `textoCifrado`). Las contraseñas no se cifran: se guardan con bcrypt.

## Estado (2026-11-04)

- Módulo y pruebas hechos. **La escritura cifrada está desactivada** (`CIFRADO_ESCRIBIR` sin definir): el API desplegado no sabe descifrar, así que cifrar ahora dejaría datos que el despliegue actual no puede leer.
- Los datos existentes **no se han cifrado**. La migración de datos se ensaya en una transacción revertida (ver abajo), nunca se aplica mientras el API desplegado sea el de `develop`.

## Campos previstos

| Tabla | Columnas | Índice ciego |
|---|---|---|
| `users` | `phone` | — |
| `reservaciones` | `cliente_telefono` | — |
| `direcciones_cliente` | `linea1`, `linea2`, `referencias` | — |
| `perfiles_facturacion` | `rfc`, `razon_social` | `rfc` (búsqueda) |
| `clientes` | `rfc`, `razon_social` | — |
| `empleados` | `curp`, `nss`, `rfc_empleado`, `clabe_interbancaria`, `telefono_emergencia`, `direccion_empleado` | `curp`, `nss`, `rfc_empleado` (hoy tienen UNIQUE) |

`facturas.rfc_receptor` y demás datos de CFDI no se cifran: son el registro fiscal emitido y deben conservarse legibles.

## Activación (pasos para cuando se despliegue este API)

1. Generar las claves fuera del repositorio: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (una para `CIFRADO_CLAVES`, otra para `CIFRADO_HMAC_CLAVE`). Guardarlas en el gestor de secretos del hosting; perderlas hace ilegibles los datos.
2. Variables: `CIFRADO_CLAVES=1:<clave>`, `CIFRADO_VERSION=1`, `CIFRADO_HMAC_CLAVE=<clave>`.
3. Migración de esquema (compatible): pasar las columnas de la tabla a `text` (el valor cifrado no cabe en `varchar(13)`), recrear `v_usuarios_perfil` si depende de `users.phone`, y añadir las columnas `*_hmac` con UNIQUE en lugar de los UNIQUE actuales de `empleados`.
4. Declarar las columnas con `textoCifrado` en `public.schema.ts`.
5. Desplegar el API con `CIFRADO_ESCRIBIR=false` (lee ambos formatos) y comprobar la web y la móvil.
6. Activar `CIFRADO_ESCRIBIR=true` y cifrar los datos existentes con un script por lotes que guarde el valor previo (como `respaldo_20261104.normalizacion_previa`) para poder revertir.
7. Rotación: añadir `2:<clave nueva>` a `CIFRADO_CLAVES`, poner `CIFRADO_VERSION=2` y volver a cifrar por lotes; la versión 1 se retira cuando no quede ningún valor `enc:v1:`.
