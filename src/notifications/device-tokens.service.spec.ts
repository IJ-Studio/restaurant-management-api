import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import { DeviceTokensService } from './device-tokens.service';

const dialect = new PgDialect();
const toSql = (condition: SQL) => dialect.sqlToQuery(condition);
/** Condición (`where`) con la que se llamó al mock por primera vez. */
const firstCondition = (mock: jest.Mock) =>
  toSql((mock.mock.calls as SQL[][])[0][0]);

function setup(selectRows: { token: string }[] = []) {
  const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
  const deleteWhere = jest.fn().mockResolvedValue(undefined);
  const selectWhere = jest.fn().mockResolvedValue(selectRows);
  const innerJoin = jest.fn().mockReturnValue({ where: selectWhere });
  const db = {
    insert: jest.fn().mockReturnValue({ values }),
    delete: jest.fn().mockReturnValue({ where: deleteWhere }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({ where: selectWhere, innerJoin }),
    }),
  };
  const service = new DeviceTokensService(db as never);
  return {
    service,
    db,
    values,
    onConflictDoUpdate,
    deleteWhere,
    selectWhere,
    innerJoin,
  };
}

const TOKEN = 'ExponentPushToken[abc123]';

describe('DeviceTokensService', () => {
  it('registra el token del usuario y lo reasigna si el dispositivo ya existía', async () => {
    const { service, values, onConflictDoUpdate } = setup();

    await service.register(7, { token: TOKEN, platform: 'android' });

    expect(values).toHaveBeenCalledWith({
      userId: 7,
      token: TOKEN,
      platform: 'android',
    });
    const [{ set }] = onConflictDoUpdate.mock.calls[0] as [
      { set: Record<string, unknown> },
    ];
    expect(set).toMatchObject({ userId: 7, platform: 'android' });
  });

  it('al cerrar sesión solo borra el token si es del mismo usuario', async () => {
    const { service, deleteWhere } = setup();

    await service.unregister(7, TOKEN);

    const query = firstCondition(deleteWhere);
    expect(query.sql).toContain('"device_tokens"."token" = $1');
    expect(query.sql).toContain('"device_tokens"."user_id" = $2');
    expect(query.params).toEqual([TOKEN, 7]);
  });

  it('devuelve los tokens de los usuarios pedidos', async () => {
    const { service, selectWhere } = setup([{ token: TOKEN }]);

    await expect(service.findTokensByUserIds([3, 4])).resolves.toEqual([TOKEN]);
    expect(firstCondition(selectWhere).params).toEqual([3, 4]);
  });

  it('busca por rol solo al personal activo', async () => {
    const { service, selectWhere, innerJoin } = setup([{ token: TOKEN }]);

    await expect(service.findTokensByRoles([4])).resolves.toEqual([TOKEN]);
    expect(innerJoin).toHaveBeenCalled();
    const query = firstCondition(selectWhere);
    expect(query.sql).toContain('"users"."is_active" = $2');
    expect(query.params).toEqual([4, true]);
  });

  it('no consulta la base con listas vacías', async () => {
    const { service, db } = setup();

    await expect(service.findTokensByUserIds([])).resolves.toEqual([]);
    await expect(service.findTokensByRoles([])).resolves.toEqual([]);
    await service.removeTokens([]);

    expect(db.select).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it('borra los tokens que Expo reporta como no registrados', async () => {
    const { service, deleteWhere } = setup();

    await service.removeTokens([TOKEN]);

    expect(firstCondition(deleteWhere).params).toEqual([TOKEN]);
  });
});
