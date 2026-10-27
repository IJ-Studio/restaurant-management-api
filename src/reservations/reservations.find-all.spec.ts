import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import { ReservationsService } from './reservations.service';

const dialect = new PgDialect();

function setup() {
  const orderBy = jest.fn().mockResolvedValue([]);
  const where = jest.fn().mockReturnValue({ orderBy });
  const db = {
    select: () => ({ from: () => ({ where }) }),
  };
  const service = new ReservationsService(db as never);
  const condition = () => {
    const [arg] = where.mock.calls[0] as [SQL | undefined];
    return arg ? dialect.sqlToQuery(arg) : undefined;
  };
  return { service, condition };
}

describe('ReservationsService.findAll', () => {
  it('combina todos los filtros con AND (antes solo quedaba el último)', async () => {
    const { service, condition } = setup();

    await service.findAll({
      fechaDesde: '2026-10-26T00:00:00.000Z',
      fechaHasta: '2026-10-27T00:00:00.000Z',
      estatus: 'confirmada',
      clienteNombre: 'Ana',
    });

    const query = condition();
    expect(query?.sql.match(/ and /g)).toHaveLength(3);
    expect(query?.params).toEqual([
      '2026-10-26T00:00:00.000Z',
      '2026-10-27T00:00:00.000Z',
      'confirmada',
      '%Ana%',
    ]);
  });

  it('busca % y _ del nombre como texto, no como comodines', async () => {
    const { service, condition } = setup();

    await service.findAll({ clienteNombre: '100%_x' });

    expect(condition()?.params).toEqual(['%100\\%\\_x%']);
  });

  it('ignora fechas inválidas y sin filtros no agrega WHERE', async () => {
    const { service, condition } = setup();

    await service.findAll({ fechaDesde: 'no-es-fecha' });

    expect(condition()).toBeUndefined();
  });
});
