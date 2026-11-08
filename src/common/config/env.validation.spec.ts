import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgres://usuario:clave@localhost:5432/quijote',
  JWT_SECRET: 'x'.repeat(32),
  JWT_ACCESS_TOKEN_TTL: '3600',
  STRIPE_SECRET_KEY: 'sk_test_falso',
  STRIPE_WEBHOOK_SECRET: 'whsec_falso',
  FACTURAPI_TEST_KEY: 'sk_test_falso',
};

describe('validateEnv', () => {
  it('acepta una configuración completa', () => {
    expect(validateEnv({ ...base })).toMatchObject({
      JWT_ACCESS_TOKEN_TTL: '3600',
    });
  });

  it.each([
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_ACCESS_TOKEN_TTL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'FACTURAPI_TEST_KEY',
  ])('falla si falta %s', (key) => {
    const config: Record<string, unknown> = { ...base };
    delete config[key];

    expect(() => validateEnv(config)).toThrow(key);
  });

  it('exige un JWT_SECRET de al menos 32 caracteres', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'corto' })).toThrow(
      'JWT_SECRET',
    );
  });

  it.each(['abc', '0', '-1', '1.5'])('rechaza el TTL no numérico %s', (ttl) => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_TOKEN_TTL: ttl })).toThrow(
      'JWT_ACCESS_TOKEN_TTL',
    );
  });

  it('valida PORT y TRUST_PROXY si vienen', () => {
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow('PORT');
    expect(() => validateEnv({ ...base, TRUST_PROXY: '-1' })).toThrow(
      'TRUST_PROXY',
    );
    expect(
      validateEnv({ ...base, PORT: '10000', TRUST_PROXY: '1' }),
    ).toBeDefined();
  });

  it('no incluye los valores en el mensaje de error', () => {
    const secreto = 'secreto-muy-corto';
    let message = '';

    try {
      validateEnv({ ...base, JWT_SECRET: secreto });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('JWT_SECRET');
    expect(message).not.toContain(secreto);
  });
});
