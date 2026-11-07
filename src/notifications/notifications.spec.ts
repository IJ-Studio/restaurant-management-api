import { ROLES } from '../common/constants/roles';
import type { DeviceTokensService } from './device-tokens.service';
import { NotificationsService, EXPO_PUSH_URL } from './notifications.service';

const validToken = 'ExponentPushToken[abcDEF123_-xyz]';

describe('NotificationsService.sendToRoles', () => {
  const tokensWith = (tokens: string[]) => ({
    findTokensByRoles: jest.fn().mockResolvedValue(tokens),
    removeTokens: jest.fn().mockResolvedValue(undefined),
  });
  const service = (deviceTokens: ReturnType<typeof tokensWith>) =>
    new NotificationsService(deviceTokens as unknown as DeviceTokensService);
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('no consulta ni envía nada si los roles no son de personal (cliente)', async () => {
    const deviceTokens = tokensWith([validToken]);
    global.fetch = jest.fn();
    await service(deviceTokens).sendToRoles([ROLES.CLIENTE], {
      title: 't',
      body: 'b',
    });
    expect(deviceTokens.findTokensByRoles).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('pide solo los tokens de los roles de personal indicados', async () => {
    const deviceTokens = tokensWith([]);
    global.fetch = jest.fn();
    await service(deviceTokens).sendToRoles([ROLES.CLIENTE, ROLES.COCINA], {
      title: 't',
      body: 'b',
    });
    expect(deviceTokens.findTokensByRoles).toHaveBeenCalledWith([ROLES.COCINA]);
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
    await service(tokensWith(tokens)).sendToRoles([ROLES.MESERO], {
      title: 'Pedido listo',
      body: 'Mesa 4',
      data: { ordenId: 12 },
    });
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

  it('borra los tokens que Expo reporta como DeviceNotRegistered', async () => {
    const dead = 'ExponentPushToken[muerto]';
    const deviceTokens = tokensWith([validToken, dead]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { status: 'ok' },
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
          ],
        }),
    }) as never;
    await service(deviceTokens).sendToRoles([ROLES.COCINA], {
      title: 't',
      body: 'b',
    });
    expect(deviceTokens.removeTokens).toHaveBeenCalledWith([dead]);
  });

  it.each([
    ['la red falla', () => Promise.reject(new Error('red caída'))],
    ['Expo responde 500', () => Promise.resolve({ ok: false, status: 500 })],
  ])('no lanza si %s', async (_caso, impl) => {
    global.fetch = jest.fn(impl) as never;
    await expect(
      service(tokensWith([validToken])).sendToRoles([ROLES.COCINA], {
        title: 't',
        body: 'b',
      }),
    ).resolves.toBeUndefined();
  });
});
