# Código de verificación (OTP) para áreas sensibles del personal — diseño (Fase 4.8)

**Estado: solo diseño, contratos y tabla. No está activo** (el API no expone estas rutas y la migración
`2026-11-15-codigos-verificacion.sql` no está aplicada en ninguna base).

## Para qué
Un segundo factor al entrar a áreas donde un error o un abuso cuesta dinero: nómina, personal (altas,
roles, bajas), cortes de caja, facturas y ajustes. El login sigue igual; el código se pide al abrir el
área y vale 30 minutos para ese propósito.

## Flujo
1. La app o la web pide `POST /verificacion/codigo` `{ proposito }` con la sesión del personal.
2. El API genera 6 dígitos (`crypto.randomInt`), guarda **solo el hash** (SHA-256 con `OTP_PEPPER`),
   vence en 10 minutos y lo envía por correo con `CorreoService` (Brevo; hoy apagado con
   `CORREO_ACTIVO`). Respuesta: `202 { expiraEn }` sin decir si el correo existe.
3. La persona escribe el código: `POST /verificacion/validar` `{ proposito, codigo }`.
   - Correcto y vigente → marca `usado_en` y responde `{ token, expiraEn }`: un JWT corto (30 min)
     con `scope: "otp:<proposito>"`.
   - Incorrecto → `intentos + 1`; al quinto, el código se invalida. Mensaje único: «El código no es
     válido o ya venció.».
4. Las rutas del área exigen el encabezado `X-Verificacion: <token>` mediante un guard
   `@RequiereVerificacion('nomina')`; sin él → `403 { code: "VERIFICACION_REQUERIDA" }` y el cliente
   muestra la pantalla del código.

## Límites
- Un código nuevo invalida los anteriores del mismo propósito.
- Máximo 3 envíos por persona cada 15 minutos (throttle por usuario, no por IP).
- Registro en `logs_auditoria` de envíos, validaciones y fallos (sin el código).

## Variables
`OTP_ACTIVO` (por defecto `false`: el guard deja pasar), `OTP_PEPPER`, y las de correo existentes.

## Activación (cuando se decida)
Aplicar la migración, definir las variables, activar en el API y añadir la pantalla del código en la
web y la app (misma pantalla y textos en ambas).
