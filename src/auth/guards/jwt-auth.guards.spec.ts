import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { CacheService } from '../../cache/cache.service';
import { JwtAuthGuard } from './jwt-auth.guards';

const SECRET = 'secreto-de-prueba';
const jwt = new JwtService({});
const payload = {
  id: '7',
  email: 'ana@quijote.mx',
  roleId: 3,
  tokenId: 'tok-1',
};

function contextWith(authorization?: string): ExecutionContext {
  const request = { headers: authorization ? { authorization } : {} };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

async function setup() {
  const cache = new CacheService();
  await cache.set('session-tok-1', '7');
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
  return new JwtAuthGuard(
    { secret: SECRET, accessTokenTtl: 3600 },
    jwt,
    cache,
    reflector,
  );
}

const b64 = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('JwtAuthGuard', () => {
  it('acepta un token válido y vigente', async () => {
    const token = await jwt.signAsync(payload, {
      secret: SECRET,
      expiresIn: 60,
    });
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${token}`)),
    ).resolves.toBe(true);
  });

  it('la misma persona puede tener dos sesiones a la vez (web y app)', async () => {
    const guard = await setup();
    const cache = (guard as unknown as { cacheService: CacheService })
      .cacheService;
    await cache.set('session-tok-2', '7');
    const first = await jwt.signAsync(payload, {
      secret: SECRET,
      expiresIn: 60,
    });
    const second = await jwt.signAsync(
      { ...payload, tokenId: 'tok-2' },
      { secret: SECRET, expiresIn: 60 },
    );

    await expect(
      guard.canActivate(contextWith(`Bearer ${first}`)),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contextWith(`Bearer ${second}`)),
    ).resolves.toBe(true);
  });

  it('sesión cerrada (o servidor reiniciado) → 401', async () => {
    const token = await jwt.signAsync(
      { ...payload, tokenId: 'tok-cerrado' },
      { secret: SECRET, expiresIn: 60 },
    );
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${token}`)),
    ).rejects.toThrow('Token no encontrado o expirado');
  });

  it('la sesión de otra persona no sirve aunque el token esté bien firmado', async () => {
    const token = await jwt.signAsync(
      { ...payload, id: '8' },
      { secret: SECRET, expiresIn: 60 },
    );
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('tras revocar todas las sesiones de la persona → 401', async () => {
    const guard = await setup();
    const cache = (guard as unknown as { cacheService: CacheService })
      .cacheService;
    const token = await jwt.signAsync(payload, {
      secret: SECRET,
      expiresIn: 60,
    });
    await cache.set('revoked-7', Date.now() + 1000);

    await expect(
      guard.canActivate(contextWith(`Bearer ${token}`)),
    ).rejects.toThrow('Token revocado');
  });

  it('sin token → 401', async () => {
    await expect(
      (await setup()).canActivate(contextWith()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('firma alterada → 401', async () => {
    const token = await jwt.signAsync(payload, {
      secret: 'otro-secreto',
      expiresIn: 60,
    });
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rol modificado en el payload sin volver a firmar → 401', async () => {
    const [header, , signature] = (
      await jwt.signAsync(payload, { secret: SECRET, expiresIn: 60 })
    ).split('.');
    const tampered = `${header}.${b64({ ...payload, roleId: 1 })}.${signature}`;
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${tampered}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('algoritmo "none" → 401', async () => {
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...payload, exp: Date.now() / 1000 + 60 })}.`;
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${unsigned}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('token expirado → 401', async () => {
    const token = await jwt.signAsync(
      { ...payload, exp: Math.floor(Date.now() / 1000) - 10 },
      { secret: SECRET },
    );
    await expect(
      (await setup()).canActivate(contextWith(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('formato distinto de Bearer → 401', async () => {
    await expect(
      (await setup()).canActivate(contextWith('Basic abc')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
