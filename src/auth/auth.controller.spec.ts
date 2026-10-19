import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

import { AuthController } from './auth.controller';

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
