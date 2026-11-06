import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { origenesCors } from './cors';

/** Límite explícito del body JSON (DT-21). El webhook de Stripe usa su propio parser raw. */
export const BODY_LIMIT = '100kb';

/**
 * Saltos de proxy de confianza para que `req.ip` sea la IP del cliente detrás de Render
 * (NH-15). Por defecto 1; se puede sobreescribir con `TRUST_PROXY`.
 */
export function parseTrustProxy(
  raw: string | undefined = process.env.TRUST_PROXY,
): number {
  if (raw === undefined || raw.trim() === '') return 1;

  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : 1;
}

/** Configuración de borde HTTP compartida por `main.ts` y las pruebas. */
export function configureHttp(app: NestExpressApplication): void {
  // La CSP por defecto bloquea los scripts inline de Swagger UI; en producción
  // no hay Swagger y se mantiene la CSP de helmet.
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
    }),
  );
  app.set('trust proxy', parseTrustProxy());
  app.enableCors({ origin: origenesCors() });
}
