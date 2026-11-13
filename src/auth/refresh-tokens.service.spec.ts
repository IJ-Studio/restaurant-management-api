import { createHash } from 'node:crypto';

import { RefreshTokensService } from './refresh-tokens.service';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function setup(options: { consumed?: unknown[]; known?: unknown[] } = {}) {
  const { consumed = [], known = [] } = options;
  const insertValues = jest.fn().mockResolvedValue(undefined);
  const deleteWhere = jest.fn().mockResolvedValue(undefined);
  // `update().set().where()` se espera directo (revocar) o con `.returning()` (gastar).
  const updateWhere = jest.fn(() =>
    Object.assign(Promise.resolve(), {
      returning: jest.fn().mockResolvedValue(consumed),
    }),
  );
  const db = {
    insert: jest.fn().mockReturnValue({ values: insertValues }),
    delete: jest.fn().mockReturnValue({ where: deleteWhere }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({ where: updateWhere }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(known),
      }),
    }),
  };
  return {
    service: new RefreshTokensService(db as never),
    db,
    insertValues,
    deleteWhere,
    updateWhere,
  };
}

describe('RefreshTokensService', () => {
  it('emite un token aleatorio y guarda solo su hash', async () => {
    const { service, insertValues, deleteWhere } = setup();

    const token = await service.issue(7);

    expect(token).toMatch(/^[A-Za-z0-9_-]{64}$/);
    const [row] = insertValues.mock.calls[0] as [
      { userId: number; tokenHash: string },
    ];
    expect(row.userId).toBe(7);
    expect(row.tokenHash).toBe(sha256(token));
    expect(JSON.stringify(row)).not.toContain(token);
    // Limpia los caducados del usuario antes de insertar.
    expect(deleteWhere).toHaveBeenCalledTimes(1);
  });

  it('dos tokens emitidos nunca coinciden', async () => {
    const { service } = setup();

    expect(await service.issue(7)).not.toBe(await service.issue(7));
  });

  it('gastar un token vigente devuelve a su dueño', async () => {
    const { service, db } = setup({ consumed: [{ userId: 7 }] });

    await expect(service.consume('vigente')).resolves.toBe(7);
    expect(db.select).not.toHaveBeenCalled();
  });

  it('un token desconocido o caducado no sirve y no revoca nada más', async () => {
    const { service, updateWhere } = setup({ consumed: [], known: [] });

    await expect(service.consume('inventado')).resolves.toBeNull();
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it('reutilizar un token ya gastado revoca todos los del usuario', async () => {
    const { service, updateWhere } = setup({
      consumed: [],
      known: [{ userId: 7, revokedAt: '2026-11-13T10:00:00Z' }],
    });

    await expect(service.consume('copiado')).resolves.toBeNull();
    // 1.º el intento de gastarlo; 2.º la revocación de todos.
    expect(updateWhere).toHaveBeenCalledTimes(2);
  });
});
