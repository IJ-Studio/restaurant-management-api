# Variables de configuración añadidas en `fix/api-correcciones`

Solo nombres y uso; los valores van en el gestor de secretos del hosting, nunca en el repositorio.

| Variable | Uso | Si falta |
|---|---|---|
| `PREDICCION_NO_SHOW_ACTIVA` | `true` activa la predicción de ausencias de reservas (Prioridad 3.5). | Desactivada: `GET /reservations/:id/no-show-risk` responde 404 y el modelo no se entrena. La web oculta la columna. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Firma de subidas de imágenes (`POST /imagenes/firma`). | 503 en la firma; la web no puede subir fotos. |
| `CIFRADO_CLAVES`, `CIFRADO_VERSION`, `CIFRADO_HMAC_CLAVE`, `CIFRADO_ESCRIBIR` | Cifrado de campos sensibles (ver `docs/cifrado-campos.md`). | Los valores se guardan y leen en claro. |
