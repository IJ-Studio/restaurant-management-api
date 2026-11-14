import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { CacheService } from '../cache/cache.service';
import { ROLES } from '../common/constants/roles';
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
  const cacheDelete = jest.fn();
  const cache = {
    set: cacheSet,
    delete: cacheDelete,
  } as unknown as CacheService;
  const refreshTokens = {
    issue: jest.fn().mockResolvedValue('refresco-nuevo'),
    consume: jest.fn().mockResolvedValue(7),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AuthService(
    db as never,
    { secret: 's', accessTokenTtl: 3600 },
    bcrypt,
    jwt,
    cache,
    refreshTokens as never,
  );
  return { service, compare, cacheSet, cacheDelete, refreshTokens };
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
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringMatching(/^session-/),
      '7',
      3600,
    );
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

describe('AuthService: sesión por dispositivo y refresco', () => {
  it('el login entrega también un token de refresco', async () => {
    const { service, refreshTokens } = setup([dbUser], true);

    const result = await service.SignIn({
      email: dbUser.email,
      password: 'Pass#2026',
    });

    expect(result.refreshToken).toBe('refresco-nuevo');
    expect(refreshTokens.issue).toHaveBeenCalledWith(7);
  });

  it('si no se puede emitir el refresco (migración sin aplicar), el login sigue funcionando', async () => {
    const { service, refreshTokens } = setup([dbUser], true);
    refreshTokens.issue.mockRejectedValue(
      new Error('relation "refresh_tokens" does not exist'),
    );

    const result = await service.SignIn({
      email: dbUser.email,
      password: 'Pass#2026',
    });

    expect(result.accessToken).toBe('jwt.firmado');
    expect(result.refreshToken).toBeUndefined();
  });

  it('refresh: gasta el token y abre una sesión nueva con otro refresco', async () => {
    const { service, refreshTokens, cacheSet } = setup([dbUser], true);

    const result = await service.refresh('refresco-viejo');

    expect(refreshTokens.consume).toHaveBeenCalledWith('refresco-viejo');
    expect(result).toMatchObject({
      accessToken: 'jwt.firmado',
      refreshToken: 'refresco-nuevo',
      user: { id: 7 },
    });
    expect(result.user).not.toHaveProperty('password');
    expect(cacheSet).toHaveBeenCalledWith(
      expect.stringMatching(/^session-/),
      '7',
      3600,
    );
  });

  it('refresh: token desconocido, caducado o ya usado → 401 y no abre sesión', async () => {
    const { service, refreshTokens, cacheSet } = setup([dbUser], true);
    refreshTokens.consume.mockResolvedValue(null);

    await expect(service.refresh('robado')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it('refresh: una cuenta desactivada no renueva su sesión', async () => {
    const { service, refreshTokens } = setup(
      [{ ...dbUser, isActive: false }],
      true,
    );

    await expect(service.refresh('refresco')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('cerrar sesión borra solo la sesión de ese dispositivo y revoca su refresco', async () => {
    const { service, cacheDelete, refreshTokens } = setup([dbUser], true);

    await service.signOut(
      { id: '7', email: dbUser.email, roleId: 3, tokenId: 'tok-celular' },
      'refresco-celular',
    );

    expect(cacheDelete).toHaveBeenCalledWith('session-tok-celular');
    expect(refreshTokens.revoke).toHaveBeenCalledWith('refresco-celular');
    expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('revocar todo marca a la persona y anula todos sus refrescos', async () => {
    const { service, cacheSet, refreshTokens } = setup([dbUser], true);

    await service.revokeAllSessions(7);

    expect(cacheSet).toHaveBeenCalledWith(
      'revoked-7',
      expect.any(Number),
      3600,
    );
    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(7);
  });
});

describe('AuthService.SignUp', () => {
  it('asigna el rol de cliente (5), no el de mesero (3)', async () => {
    const values = jest
      .fn()
      .mockImplementation((row: Record<string, unknown>) => ({
        returning: () => Promise.resolve([{ ...dbUser, ...row, id: 42 }]),
      }));
    const db = {
      insert: () => ({ values }),
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    };
    const bcrypt = {
      hash: jest.fn().mockResolvedValue('$2b$10$hash'),
    } as unknown as BcryptService;
    const service = new AuthService(
      db as never,
      { secret: 's', accessTokenTtl: '3600' },
      bcrypt,
      {} as JwtService,
      {} as CacheService,
      {} as never,
    );

    const result = await service.SignUp({
      name: 'Ana',
      lastname: 'López',
      phone: '+525512345678',
      email: 'ana@quijote.mx',
      password: 'Pass#2026x',
      passwordConfirm: 'Pass#2026x',
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: ROLES.CLIENTE }),
    );
    expect(result.roleId).toBe(ROLES.CLIENTE);
    expect(result.roleId).not.toBe(ROLES.MESERO);
  });
});

describe('AuthService.getCurrentUser', () => {
  function setupUser(rows: unknown[]) {
    const db = {
      select: () => ({
        from: () => ({ where: jest.fn().mockResolvedValue(rows) }),
      }),
    };
    return new AuthService(
      db as never,
      { secret: 's', accessTokenTtl: '3600' },
      {} as BcryptService,
      {} as JwtService,
      {} as CacheService,
      {} as never,
    );
  }

  it('lee el usuario actual de la BD y no devuelve tokenId', async () => {
    const result = await setupUser([dbUser]).getCurrentUser(7);

    expect(result).toEqual(toPublicUser(dbUser));
    expect(result).not.toHaveProperty('tokenId');
  });

  it('usuario inexistente → 401', async () => {
    const error: unknown = await setupUser([])
      .getCurrentUser(99)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedException);
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
