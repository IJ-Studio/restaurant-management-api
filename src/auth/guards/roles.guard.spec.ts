import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES } from '../../common/constants/roles';
import { RolesGuard } from './roles.guard';

function contextWith(user?: { roleId: number }): ExecutionContext {
  const request = { user };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guardWith(requiredRoles?: number[]) {
  const reflector = {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('sin usuario en la petición → false (no lanza 500)', () => {
    expect(guardWith([ROLES.ADMIN]).canActivate(contextWith())).toBe(false);
  });

  it('usuario con un rol distinto al exigido → false', () => {
    expect(
      guardWith([ROLES.ADMIN]).canActivate(
        contextWith({ roleId: ROLES.MESERO }),
      ),
    ).toBe(false);
  });

  it('usuario con el rol exigido → true', () => {
    expect(
      guardWith([ROLES.ADMIN]).canActivate(
        contextWith({ roleId: ROLES.ADMIN }),
      ),
    ).toBe(true);
  });

  it('ruta sin @Roles → true', () => {
    expect(guardWith().canActivate(contextWith())).toBe(true);
  });
});
