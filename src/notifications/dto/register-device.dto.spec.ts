import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { createStrictValidationPipe } from '../../common/config/validation.config';
import { RegisterDeviceDto } from './register-device.dto';

const validate = (value: unknown) =>
  createStrictValidationPipe().transform(value, {
    type: 'body',
    metatype: RegisterDeviceDto,
  });

describe('RegisterDeviceDto', () => {
  it.each([
    'ExponentPushToken[xXxXxXxXxXxXxXxXxXxXxX]',
    'ExpoPushToken[abc-123_DEF]',
  ])('acepta el token de Expo %s', async (token) => {
    await expect(
      validate({ token, platform: 'android' }),
    ).resolves.toMatchObject({ token });
  });

  it.each([
    '',
    'fcm-token-crudo',
    'ExponentPushToken[]',
    "ExponentPushToken[x'; DROP TABLE device_tokens;--]",
    `ExponentPushToken[${'a'.repeat(260)}]`,
  ])('rechaza con 400 el token inválido %#', async (token) => {
    await expect(
      validate({ token, platform: 'android' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una plataforma desconocida', async () => {
    await expect(
      validate({ token: 'ExponentPushToken[abc]', platform: 'web' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza campos de más (no se puede registrar el token a nombre de otro usuario)', async () => {
    await expect(
      validate({ token: 'ExponentPushToken[abc]', platform: 'ios', userId: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
