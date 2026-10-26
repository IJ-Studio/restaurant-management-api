type Env = Record<string, unknown>;

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_ACCESS_TOKEN_TTL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FACTURAPI_TEST_KEY',
] as const;

const MIN_JWT_SECRET_LENGTH = 32;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Validación de variables de entorno al arrancar (DT-35 / NH-07). Falla si falta una
 * variable obligatoria, si el secreto JWT es corto o si el TTL no es numérico.
 *
 * Los mensajes nombran la variable pero nunca incluyen su valor (no filtrar secretos).
 */
export function validateEnv(config: Env): Env {
  const errors: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!isNonEmptyString(config[key])) {
      errors.push(`${key} es obligatoria.`);
    }
  }

  const jwtSecret = config.JWT_SECRET;
  if (isNonEmptyString(jwtSecret) && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres.`,
    );
  }

  const ttl = config.JWT_ACCESS_TOKEN_TTL;
  if (isNonEmptyString(ttl)) {
    const seconds = Number(ttl);
    if (!Number.isInteger(seconds) || seconds <= 0) {
      errors.push(
        'JWT_ACCESS_TOKEN_TTL debe ser un número entero de segundos mayor que 0.',
      );
    }
  }

  validateInteger(config.PORT, 'PORT', 1, errors);
  validateInteger(config.TRUST_PROXY, 'TRUST_PROXY', 0, errors);

  if (
    config.DATABASE_SSL !== undefined &&
    config.DATABASE_SSL !== '' &&
    config.DATABASE_SSL !== 'true' &&
    config.DATABASE_SSL !== 'false'
  ) {
    errors.push('DATABASE_SSL debe ser "true" o "false".');
  }

  if (errors.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errors.join('\n- ')}`);
  }

  return config;
}

function validateInteger(
  value: unknown,
  name: string,
  minimum: number,
  errors: string[],
): void {
  if (value === undefined || value === '') return;

  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) {
    errors.push(`${name} debe ser un entero mayor o igual a ${minimum}.`);
  }
}
