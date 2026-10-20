import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

import { ROLES } from '../common/constants/roles';
import { NotificationsController } from './notifications.controller';
import { NotificationsService, EXPO_PUSH_URL } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

const validToken = 'ExponentPushToken[abcDEF123_-xyz]';

const errorsFor = async (plain: object) =>
  validate(plainToInstance(RegisterDeviceDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('RegisterDeviceDto', () => {
  it('acepta un token de Expo y una plataforma válida', async () => {
    expect(await errorsFor({ token: validToken, platform: 'android' })).toEqual(
      [],
    );
  });

  it.each([
    ['sin formato de Expo', { token: 'abc', platform: 'ios' }],
    [
      'con caracteres de inyección',
      { token: "ExponentPushToken[a'; DROP TABLE users;--]", platform: 'ios' },
    ],
    [
      'demasiado largo',
      { token: `ExponentPushToken[${'a'.repeat(250)}]`, platform: 'ios' },
    ],
    ['plataforma desconocida', { token: validToken, platform: 'windows' }],
    ['campo extra (userId)', { token: validToken, platform: 'ios', userId: 1 }],
  ])('rechaza %s', async (_caso, body) => {
    expect((await errorsFor(body)).length).toBeGreaterThan(0);
  });
});

describe('NotificationsController', () => {
  it('solo personal (no clientes) y con límite de peticiones', () => {
    expect(Reflect.getMetadata('roles', NotificationsController)).toEqual([
      ROLES.ADMIN,
      ROLES.CAJERO,
      ROLES.MESERO,
      ROLES.COCINA,
    ]);
    for (const method of ['register', 'unregister'] as const) {
      const handler = Object.getOwnPropertyDescriptor(
        NotificationsController.prototype,
        method,
      )?.value as object;
      expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler)).toBe(
        10,
      );
      expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, handler)).toBe(
        60_000,
      );
    }
  });
});

describe('NotificationsService.sendToRoles', () => {
  const dbWithTokens = (tokens: string[]) => {
    const chain: Record<string, unknown> = {};
    chain.from = () => chain;
    chain.innerJoin = () => chain;
    chain.where = () => Promise.resolve(tokens.map((token) => ({ token })));
    return { select: () => chain, delete: () => ({ where: jest.fn() }) };
  };
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('no consulta ni envía nada si los roles no son de personal (cliente)', async () => {
    const db = dbWithTokens([validToken]);
    const select = jest.spyOn(db, 'select');
    global.fetch = jest.fn();
    await new NotificationsService(db as never).sendToRoles([ROLES.CLIENTE], {
      title: 't',
      body: 'b',
    });
    expect(select).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('envía en lotes de 100 y solo manda título, texto y datos indicados', async () => {
    const tokens = Array.from(
      { length: 150 },
      (_, i) => `ExponentPushToken[tok${String(i).padStart(8, '0')}]`,
    );
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    global.fetch = fetchMock as never;
    await new NotificationsService(dbWithTokens(tokens) as never).sendToRoles(
      [ROLES.MESERO],
      { title: 'Pedido listo', body: 'Mesa 4', data: { ordenId: 12 } },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe(EXPO_PUSH_URL);
    const first = JSON.parse(init.body) as Record<string, unknown>[];
    expect(first).toHaveLength(100);
    expect(Object.keys(first[0]).sort()).toEqual([
      'body',
      'data',
      'sound',
      'title',
      'to',
    ]);
  });

  it.each([
    ['la red falla', () => Promise.reject(new Error('red caída'))],
    ['Expo responde 500', () => Promise.resolve({ ok: false, status: 500 })],
  ])('no lanza si %s', async (_caso, impl) => {
    global.fetch = jest.fn(impl) as never;
    await expect(
      new NotificationsService(dbWithTokens([validToken]) as never).sendToRoles(
        [ROLES.COCINA],
        { title: 't', body: 'b' },
      ),
    ).resolves.toBeUndefined();
  });
});
