import 'reflect-metadata';

import {
  type CanActivate,
  type ExecutionContext,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { globSync } from 'node:fs';
import { join } from 'node:path';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CacheService } from '../cache/cache.service';
import { ROLES, ROLE_NAMES } from '../common/constants/roles';
import { type Acceso, MATRIZ_RBAC } from './matriz-rbac';

/**
 * Prueba de regresión de autorización (api#67): recorre todos los controladores, arma la matriz
 * rol × ruta con los guards reales (`JwtAuthGuard`, global, y `RolesGuard`, donde el controlador
 * lo aplica) y la compara con `MATRIZ_RBAC`. Criterio: ninguna ruta accesible fuera de su rol.
 *
 * No levanta la app ni toca la base: los guards solo leen los decoradores y el token.
 */

type Controlador = abstract new (...args: never[]) => unknown;

interface Ruta {
  clave: string;
  controlador: Controlador;
  handler: (...args: unknown[]) => unknown;
  /** Lo que dicen los decoradores de la ruta. */
  acceso: Acceso;
  /** Si `RolesGuard` corre en esta ruta (en la clase o en el método). */
  conRolesGuard: boolean;
}

const SECRET = 'secreto-de-prueba-rbac';
const RAIZ = join(__dirname, '..');
const ANONIMO = 0;
const QUIENES = [ANONIMO, ...Object.values(ROLES)];
const nombre = (rol: number) => (rol === ANONIMO ? 'anónimo' : ROLE_NAMES[rol]);

function rutas(): Ruta[] {
  const encontradas: Ruta[] = [];
  for (const archivo of globSync('**/*.controller.ts', { cwd: RAIZ })) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const modulo = require(join(RAIZ, archivo)) as Record<string, unknown>;
    for (const exportado of Object.values(modulo)) {
      if (typeof exportado !== 'function') continue;
      const clase = exportado as Controlador & { prototype: object };
      const bases = Reflect.getMetadata(PATH_METADATA, clase) as
        string | string[] | undefined;
      if (bases === undefined) continue;

      for (const metodo of Object.getOwnPropertyNames(clase.prototype)) {
        const handler = (clase.prototype as Record<string, unknown>)[metodo];
        if (metodo === 'constructor' || typeof handler !== 'function') continue;
        const verbo = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (verbo === undefined) continue;

        const fn = handler as (...args: unknown[]) => unknown;
        const leer = <T>(clave: string) =>
          (Reflect.getMetadata(clave, fn) ??
            Reflect.getMetadata(clave, clase)) as T | undefined;
        const roles = leer<number[]>('roles');
        const acceso: Acceso = leer<boolean>('isPublic')
          ? 'publica'
          : roles
            ? [...roles].sort()
            : 'sesion';
        const guards = [
          ...((Reflect.getMetadata(GUARDS_METADATA, clase) as unknown[]) ?? []),
          ...((Reflect.getMetadata(GUARDS_METADATA, fn) as unknown[]) ?? []),
        ];
        const caminos = [
          Reflect.getMetadata(PATH_METADATA, fn) as string | string[],
        ];

        for (const base of [bases].flat())
          for (const camino of caminos.flat())
            encontradas.push({
              clave: `${RequestMethod[verbo]} /${[base, camino]
                .join('/')
                .replace(/\/+/g, '/')
                .replace(/^\/|\/$/g, '')}`,
              controlador: clase,
              handler: fn,
              acceso,
              conRolesGuard: guards.includes(RolesGuard),
            });
      }
    }
  }
  return encontradas.sort((a, b) => a.clave.localeCompare(b.clave));
}

const normalizar = (acceso: Acceso) =>
  typeof acceso === 'string' ? acceso : [...acceso].sort();

const puede = (acceso: Acceso, rol: number) =>
  acceso === 'publica' ||
  (rol !== ANONIMO && (acceso === 'sesion' || acceso.includes(rol)));

describe('Matriz de autorización rol × ruta (api#67)', () => {
  const todas = rutas();
  const reflector = new Reflector();
  const jwt = new JwtService({});
  const cache = new CacheService();
  const jwtGuard = new JwtAuthGuard(
    { secret: SECRET, accessTokenTtl: 3600 },
    jwt,
    cache,
    reflector,
  );
  const rolesGuard = new RolesGuard(reflector);
  const tokens = new Map<number, string>();

  beforeAll(async () => {
    for (const rol of Object.values(ROLES)) {
      const tokenId = `rbac-${rol}`;
      tokens.set(
        rol,
        await jwt.signAsync(
          {
            id: String(rol),
            email: `${ROLE_NAMES[rol]}@prueba.local`,
            roleId: rol,
            tokenId,
          },
          { secret: SECRET, expiresIn: 60 },
        ),
      );
      await cache.set(`session-${tokenId}`, String(rol));
    }
  });

  /** Corre los guards que Nest aplicaría a la ruta y dice si la petición pasa. */
  async function deja(ruta: Ruta, rol: number): Promise<boolean> {
    const token = tokens.get(rol);
    const request = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    const contexto = {
      getHandler: () => ruta.handler,
      getClass: () => ruta.controlador,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const guards: CanActivate[] = [jwtGuard];
    if (ruta.conRolesGuard) guards.push(rolesGuard);
    try {
      for (const guard of guards)
        if (!(await guard.canActivate(contexto))) return false;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) return false;
      throw error;
    }
  }

  it('encuentra las rutas de todos los controladores', () => {
    expect(todas.length).toBeGreaterThan(100);
  });

  it('cada ruta del API está en la matriz y la matriz no tiene rutas que ya no existen', () => {
    const delApi = todas.map((r) => r.clave);
    expect(new Set(delApi).size).toBe(delApi.length);
    expect(delApi).toEqual(Object.keys(MATRIZ_RBAC).sort());
  });

  it('toda ruta con @Roles tiene RolesGuard: sin él, el decorador no protege nada', () => {
    const sinGuard = todas
      .filter((r) => Array.isArray(r.acceso) && !r.conRolesGuard)
      .map((r) => r.clave);
    expect(sinGuard).toEqual([]);
  });

  describe.each(todas.map((r) => [r.clave, r] as const))(
    '%s',
    (clave, ruta) => {
      it('los decoradores coinciden con la matriz', () => {
        expect(normalizar(ruta.acceso)).toEqual(normalizar(MATRIZ_RBAC[clave]));
      });

      it('anónimo y cada rol entran solo si la matriz lo permite', async () => {
        const esperado = Object.fromEntries(
          QUIENES.map((rol) => [nombre(rol), puede(MATRIZ_RBAC[clave], rol)]),
        );
        const real: Record<string, boolean> = {};
        for (const rol of QUIENES) real[nombre(rol)] = await deja(ruta, rol);
        expect(real).toEqual(esperado);
      });
    },
  );
});
