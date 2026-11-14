# DAST con OWASP ZAP (api#69, api#71, api#78)

`zap.yml` escanea el API levantado en el runner con PostgreSQL de pruebas y datos sintéticos
(`test/db/`). **Nunca se escanea producción.**

| Escaneo | Cuándo | Qué hace | Bloquea |
|---|---|---|---|
| `zap-baseline` | Cada PR a `develop` o `main` | Importa el OpenAPI (`/docs-json`) y hace el escaneo pasivo sin sesión: cabeceras, configuración, rutas públicas (menú y reservaciones) | Cualquier alerta High |
| `zap-full-admin` y `zap-full-mesero` | Lunes en la madrugada y a mano (Actions → ZAP → Run workflow) | Escaneo activo de todas las rutas del OpenAPI con el token del rol (cabecera `Authorization`) | Cualquier alerta High |

- **Reglas aceptadas:** `.zap/rules.tsv`, una por línea con su motivo. `IGNORE` solo para lo que no
  aplica a un API JSON.
- **Evidencia:** la tabla de alertas en el Summary de cada corrida y el artefacto `<escaneo>-report`,
  con el HTML, el JSON y el Markdown de ZAP y el log del API.
- **Criterio:** cero High. Las Medium se anotan abajo con responsable y fecha. El plan de corrección
  debe estar listo antes del Sprint 5.

## Resultado de la primera corrida (14-nov-2026, PR #168)

| Escaneo | High | Medium | Low | Informativas |
|---|---|---|---|---|
| `zap-baseline` (120 reglas pasivas) | 0 | 0 | 0 | 0 |
| `zap-full-admin` | 0 | 1 | 1 | 3 |
| `zap-full-mesero` | 0 | 1 | 1 | 3 |

- **Low 100001** (*Unexpected Content-Type*): una respuesta de error que no es JSON durante el
  fuzzing. Sin impacto; se revisa con el reporte en el Sprint 5.
- **Informativas:** *Client Error response* (los 4xx esperados de la validación y de los permisos),
  *Authentication Request Identified* (el login) y *User Agent Fuzzer*.
- En el log del API aparecen errores de llave foránea en `POST /ventas` con platillos que no
  existen. El API responde un error y no guarda nada, pero conviene que responda 400 con un mensaje
  claro en lugar de dejar el error de Postgres. Queda en la tabla de abajo.

## Alertas Medium aceptadas o pendientes

| Regla | Alerta | Dónde | Decisión | Responsable | Fecha |
|---|---|---|---|---|---|
| 10106 | HTTP Only Site | Escaneos activos en CI | Aceptada: solo pasa en CI, donde el API corre en `http://localhost`. En producción Render sirve el API solo por HTTPS. Queda como `WARN` en `.zap/rules.tsv` | José | 14-nov-2026 |
| — | `POST /ventas` con un platillo inexistente | Log del API | Pendiente: validar que el platillo existe y responder 400 antes de insertar | José | Antes del Sprint 5 |
