import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { CacheService } from '../cache/cache.service';
import { AuthService, INVALID_CREDENTIALS, toPublicUser } from './auth.service';
import { BcryptService } from './bcrypt.service';

const dbUser = {
  id: 7,
  name: 'Ana',
  lastname: 'López',
  email: 'ana@quijote.mx',
  phone: '5512345678',
  password: '$2b$10$hashDeLaContrasena',
  verified: true,
  loginAttempts: 2,
  loginLockUntil: 0,
  recoveryAttempts: 0,
  recoveryLockUntil: 0,
  sessionTime: 0,
  roleId: 3,
  isActive: true,
  createdAt: '2026-10-01',
};

function setup(rows: unknown[], passwordMatches: boolean) {
  const db = {
    select: () => ({
      from: () => ({ where: jest.fn().mockResolvedValue(rows) }),
    }),
    // El login ahora escribe loginAttempts/loginLockUntil (el detalle se prueba en auth-lockout.spec.ts).
    update: () => ({
      set: () => ({
        where: () =>
          Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([{ loginAttempts: 1 }]),
          }),
      }),
    }),
  };
  const compare = jest.fn().mockResolvedValue(passwordMatches);
  const bcrypt = { compare } as unknown as BcryptService;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('jwt.firmado'),
  } as unknown as JwtService;
  const cacheSet = jest.fn();
  const cache = { set: cacheSet } as unknown as CacheService;
  const service = new AuthService(
    db as never,
    { secret: 's', accessTokenTtl: '3600' },
    bcrypt,
    jwt,
    cache,
  );
  return { service, compare, cacheSet };
}

describe('AuthService.SignIn', () => {
  it('devuelve el token y el usuario sin contraseña ni contadores de seguridad', async () => {
    const { service, cacheSet } = setup([dbUser], true);

    const result = await service.SignIn({
      email: dbUser.email,
      password: 'Pass#2026',
    });

    expect(result.accessToken).toBe('jwt.firmado');
    expect(result.user).toMatchObject({
      id: 7,
      email: 'ana@quijote.mx',
      roleId: 3,
    });
    expect(JSON.stringify(result)).not.toContain('hashDeLaContrasena');
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('loginAttempts');
    expect(cacheSet).toHaveBeenCalledWith('user-7', expect.any(String), 3600);
  });

  it.each([
    ['correo inexistente', [], true],
    ['contraseña incorrecta', [dbUser], false],
    ['cuenta inactiva', [{ ...dbUser, isActive: false }], true],
  ])('%s → 401 con el mismo mensaje genérico', async (_caso, rows, matches) => {
    const { service } = setup(rows, matches);

    const error: unknown = await service
      .SignIn({ email: 'x@quijote.mx', password: 'Pass#2026' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as Error).message).toBe(INVALID_CREDENTIALS);
  });

  it('compara la contraseña aunque el correo no exista (mismo tiempo de respuesta)', async () => {
    const { service, compare } = setup([], false);

    await service
      .SignIn({ email: 'nadie@quijote.mx', password: 'Pass#2026' })
      .catch(() => undefined);

    expect(compare).toHaveBeenCalledWith(
      'Pass#2026',
      expect.stringMatching(/^\$2b\$10\$/),
    );
  });
});

describe('toPublicUser', () => {
  it('quita los campos sensibles y conserva los demás', () => {
    expect(Object.keys(toPublicUser(dbUser)).sort()).toEqual(
      [
        'createdAt',
        'email',
        'id',
        'isActive',
        'lastname',
        'name',
        'phone',
        'roleId',
        'verified',
      ].sort(),
    );
  });
});
