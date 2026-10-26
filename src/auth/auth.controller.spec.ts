import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController (fuerza bruta)', () => {
  it.each([
    ['signIn', 5],
    ['signUp', 10],
  ] as const)('%s limita a %i peticiones por minuto', (method, limit) => {
    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      method,
    )?.value as object;
    expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler)).toBe(
      limit,
    );
    expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, handler)).toBe(
      60_000,
    );
  });
});

describe('AuthController.getMe', () => {
  it('devuelve el usuario actual desde el servicio y no el payload con tokenId', async () => {
    const publicUser = { id: 7, name: 'Ana', roleId: 5 };
    const authService = {
      getCurrentUser: jest.fn().mockResolvedValue(publicUser),
    };
    const controller = new AuthController(
      authService as unknown as AuthService,
    );

    const result = await controller.getMe({
      id: '7',
      email: 'ana@quijote.mx',
      roleId: 5,
      tokenId: 'tok-secreto',
    });

    expect(result).toEqual({ user: publicUser });
    expect(result.user).not.toHaveProperty('tokenId');
    expect(authService.getCurrentUser).toHaveBeenCalledWith(7);
  });
});
