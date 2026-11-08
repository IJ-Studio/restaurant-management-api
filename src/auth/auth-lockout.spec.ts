import { HttpException, UnauthorizedException } from '@nestjs/common';

import {
  accountLockedMessage,
  AuthService,
  LOGIN_LOCK_MS,
  MAX_LOGIN_ATTEMPTS,
} from './auth.service';

type FakeUser = {
  id: number;
  email: string;
  password: string;
  roleId: number;
  isActive: boolean;
  loginAttempts: number;
  loginLockUntil: number;
};

const baseUser = (over: Partial<FakeUser> = {}): FakeUser => ({
  id: 7,
  email: 'mesero@elquijote.mx',
  password: 'hash',
  roleId: 3,
  isActive: true,
  loginAttempts: 0,
  loginLockUntil: 0,
  ...over,
});

/** db falso: select() devuelve `rows`; update().set(x).where().returning() devuelve `returned`. */
function buildDb(
  rows: FakeUser[],
  returned: Array<{ loginAttempts: number }> = [],
) {
  const sets: Array<Record<string, unknown>> = [];
  const db = {
    select: jest.fn(() => ({
      from: () => ({ where: () => Promise.resolve(rows) }),
    })),
    update: jest.fn(() => ({
      set: (values: Record<string, unknown>) => {
        sets.push(values);
        const where = () => {
          const result = Promise.resolve(undefined) as Promise<unknown> & {
            returning: () => Promise<unknown>;
          };
          result.returning = () => Promise.resolve(returned);
          return result;
        };
        return { where };
      },
    })),
  };
  return { db, sets };
}

function buildService(db: unknown, passwordOk: boolean) {
  const bcrypt = { compare: jest.fn().mockResolvedValue(passwordOk) };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
  const cache = { set: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    db as never,
    { secret: 'test-secret', accessTokenTtl: 3600 },
    bcrypt as never,
    jwt as never,
    cache as never,
  );
  return { service, bcrypt, jwt };
}

const credentials = { email: 'mesero@elquijote.mx', password: 'Pass#2026' };

describe('AuthService.SignIn — bloqueo por cuenta', () => {
  afterEach(() => jest.restoreAllMocks());

  it('cuenta bloqueada: responde 429 con retryAfterSeconds y no compara la contraseña', async () => {
    const now = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const { db } = buildDb([baseUser({ loginLockUntil: now + 90_000 })]);
    const { service, bcrypt } = buildService(db, true);

    const error = await service.SignIn(credentials).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect((error as HttpException).getResponse()).toMatchObject({
      message: accountLockedMessage(90),
      retryAfterSeconds: 90,
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('el 429 cumple el contrato del web: `error` con "Demasiados intentos" y los segundos como primer número', async () => {
    const now = 1_500_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const { db } = buildDb([baseUser({ loginLockUntil: now + 840_000 })]);
    const { service } = buildService(db, true);

    const error = await service.SignIn(credentials).catch((e: unknown) => e);
    const body = (error as HttpException).getResponse() as { error: string };

    expect(body.error).toContain('Demasiados intentos');
    expect(Number(/(\d+)/.exec(body.error)?.[1])).toBe(840);
  });

  it('bloqueo vencido: deja entrar con la contraseña correcta y limpia el contador', async () => {
    const now = 2_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const { db, sets } = buildDb([
      baseUser({ loginAttempts: 0, loginLockUntil: now - 1_000 }),
    ]);
    const { service } = buildService(db, true);

    const result = await service.SignIn(credentials);

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(sets).toEqual([{ loginAttempts: 0, loginLockUntil: 0 }]);
  });

  it('contraseña incorrecta: suma un intento y responde 401 sin bloquear aún', async () => {
    const { db, sets } = buildDb([baseUser()], [{ loginAttempts: 1 }]);
    const { service } = buildService(db, false);

    await expect(service.SignIn(credentials)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(sets).toHaveLength(1);
    expect(sets[0]).toHaveProperty('loginAttempts');
    expect(sets[0]).not.toHaveProperty('loginLockUntil');
  });

  it(`el intento ${MAX_LOGIN_ATTEMPTS} bloquea la cuenta ${LOGIN_LOCK_MS / 60_000} minutos y reinicia el contador`, async () => {
    const now = 3_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const { db, sets } = buildDb(
      [baseUser({ loginAttempts: MAX_LOGIN_ATTEMPTS - 1 })],
      [{ loginAttempts: MAX_LOGIN_ATTEMPTS }],
    );
    const { service } = buildService(db, false);

    await expect(service.SignIn(credentials)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(sets).toHaveLength(2);
    expect(sets[1]).toEqual({
      loginAttempts: 0,
      loginLockUntil: now + LOGIN_LOCK_MS,
    });
  });

  it('login correcto con intentos previos: reinicia contador y bloqueo', async () => {
    const { db, sets } = buildDb([baseUser({ loginAttempts: 3 })]);
    const { service } = buildService(db, true);

    await service.SignIn(credentials);

    expect(sets).toEqual([{ loginAttempts: 0, loginLockUntil: 0 }]);
  });

  it('login correcto sin intentos previos: no escribe en la base de datos', async () => {
    const { db, sets } = buildDb([baseUser()]);
    const { service } = buildService(db, true);

    await service.SignIn(credentials);

    expect(sets).toHaveLength(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('cuenta inactiva con la contraseña correcta: 401 y no suma intentos', async () => {
    const { db } = buildDb([baseUser({ isActive: false })]);
    const { service } = buildService(db, true);

    await expect(service.SignIn(credentials)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(db.update).not.toHaveBeenCalled();
  });

  it('correo inexistente: no toca contadores de nadie', async () => {
    const { db } = buildDb([]);
    const { service } = buildService(db, true);

    await expect(service.SignIn(credentials)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(db.update).not.toHaveBeenCalled();
  });
});
