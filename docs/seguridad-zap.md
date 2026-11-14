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

## Alertas Medium aceptadas o pendientes

| Regla | Alerta | Dónde | Decisión | Responsable | Fecha |
|---|---|---|---|---|---|
| — | Sin Medium en la primera corrida | — | — | José | — |
