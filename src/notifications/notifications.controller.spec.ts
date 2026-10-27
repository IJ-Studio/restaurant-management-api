import { Reflector } from '@nestjs/core';

import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { DeviceTokensService } from './device-tokens.service';
import { NotificationsController } from './notifications.controller';

const user: ActiveUserData = {
  id: '7',
  email: 'mesero@quijote.mx',
  roleId: ROLES.MESERO,
  tokenId: 't',
};

describe('NotificationsController', () => {
  const deviceTokens = {
    register: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new NotificationsController(
    deviceTokens as unknown as DeviceTokensService,
  );

  it('registra el dispositivo a nombre del usuario del token, no del body', async () => {
    const dto = { token: 'ExponentPushToken[abc]', platform: 'ios' as const };
    await controller.register(dto, user);
    expect(deviceTokens.register).toHaveBeenCalledWith(7, dto);
  });

  it('da de baja el dispositivo del usuario del token', async () => {
    await controller.unregister('ExponentPushToken[abc]', user);
    expect(deviceTokens.unregister).toHaveBeenCalledWith(
      7,
      'ExponentPushToken[abc]',
    );
  });

  it('solo el personal puede registrar dispositivos (el cliente no)', () => {
    const roles = new Reflector().get<number[]>(
      'roles',
      NotificationsController,
    );
    expect(roles).toEqual([
      ROLES.ADMIN,
      ROLES.CAJERO,
      ROLES.MESERO,
      ROLES.COCINA,
    ]);
    expect(roles).not.toContain(ROLES.CLIENTE);
  });
});
