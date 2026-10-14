import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

import { AuthController } from './auth.controller';

describe('AuthController (fuerza bruta)', () => {
  it('sign-in limita a 5 intentos por minuto', () => {
    const handler = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'signIn',
    )?.value as object;
    expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler)).toBe(5);
    expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, handler)).toBe(
      60_000,
    );
  });
});
