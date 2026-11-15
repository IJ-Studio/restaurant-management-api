# Pruebas de integración: caja, pagos y facturación

Suite `src/integracion/caja-pagos-facturas.int-spec.ts`. Prueba app ↔ API ↔ base ↔ Stripe (modo test) ↔ Facturapi (sandbox) con el API corriendo de verdad. No entra en `pnpm test` ni en CI: necesita servicios externos y una base de pruebas. Se niega a correr contra algo que no sea `localhost` o con llaves que no sean `sk_test_`.

## Cómo correrla

1. Base de pruebas local con usuarios `<rol>@prueba.local` y dos platillos con precio 100.01 y 25.50.
2. `stripe listen --forward-to localhost:10000/pagos/webhook` (la llave va en `STRIPE_API_KEY`, no como argumento).
3. El API local con `STRIPE_WEBHOOK_SECRET` = el secreto que imprime `stripe listen --print-secret` y `THROTTLE_LIMIT` alto (la suite hace ~300 peticiones por minuto).
4. Variables: `API_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FACTURAPI_TEST_KEY`, `PLATILLO_CENTAVOS`, `PLATILLO_REFRESCO`.
5. `pnpm test:integracion`. Entre dos corridas espera un minuto: el inicio de sesión admite 5 intentos por minuto.

## Casos

| Id  | Qué prueba                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 100.01 entre 3 en partes iguales: 33.34 + 33.34 + 33.33, el pedido se cierra con lo pagado exacto                                               |
| D2  | Propina y cambio en efectivo; un monto mayor a lo que falta → 400                                                                               |
| D3  | Pago mixto: efectivo + tarjeta en terminal, con folio                                                                                           |
| D4  | Cuenta ya pagada → 409, un solo pago                                                                                                            |
| D5  | Dos pedidos en la misma mesa se cobran por separado                                                                                             |
| D6  | Dos cajas cobran la misma cuenta a la vez → un 201 y un 409                                                                                     |
| D7  | Dos partes a la vez que juntas pasan del total → la segunda 400                                                                                 |
| D8  | Reversa de un pago de caja (solo admin): deja de contar, la propina se descuenta, no se repite                                                  |
| D9  | Corte: esperado = fondo + efectivo + propinas en efectivo; diferencia al cerrar                                                                 |
| S1  | Tarjeta aprobada (`pm_card_visa`): el webhook cierra el pedido con un solo pago                                                                 |
| S2  | Fondos insuficientes: rechazo en la hoja de pago; con tarjeta ya elegida, 402 con mensaje                                                       |
| S3  | 3D Secure: queda `requires_action` y no marca pagado                                                                                            |
| S4  | Webhook con firma inválida → 400                                                                                                                |
| S5  | El mismo evento dos veces → `duplicate`, sin segundo pago                                                                                       |
| S6  | Cobro con tarjeta de un pedido ya pagado en caja → reembolso automático en Stripe                                                               |
| S7  | Reembolso de un cobro de Stripe: se devuelve en Stripe y el pedido se cancela                                                                   |
| F1  | RFC, uso de CFDI y régimen fuera de catálogo → 400 antes de la cola                                                                             |
| F2  | Cuenta dividida con pago mixto: caja pide la factura, dos admins emiten a la vez (201 + 409), el CFDI ampara 100.01 con la forma del pago mayor |
| F3  | Con factura vigente no se reembolsa; se cancela (motivo 03) y después sí                                                                        |
| F4  | Facturapi rechaza un dato al timbrar: la solicitud queda pendiente para corregir y reintentar                                                   |
| F5  | No se factura una cuenta sin pagar                                                                                                              |

Nota: el sandbox de Facturapi no valida el régimen contra el RFC; ese caso solo lo detecta el SAT en modo real.
