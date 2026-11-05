import { BadRequestException } from '@nestjs/common';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import { ROLES } from '../common/constants/roles';
import { FacturasAdminController } from './facturas-admin.controller';
import { FacturasAdminService, POR_PAGINA } from './facturas-admin.service';

function setup(filas: unknown[]) {
  const llamadas: { where?: SQL; limit?: number; offset?: number } = {};
  const cadena = {
    from: () => cadena,
    where: (w: SQL) => ((llamadas.where = w), cadena),
    orderBy: () => cadena,
    limit: (l: number) => ((llamadas.limit = l), cadena),
    offset: (o: number) => ((llamadas.offset = o), Promise.resolve(filas)),
  };
  const db = { select: () => cadena };
  return { service: new FacturasAdminService(db as never), llamadas };
}

describe('GET /facturas (admin)', () => {
  it('pagina en el servidor y avisa si hay otra página', async () => {
    const { service, llamadas } = setup(
      Array.from({ length: POR_PAGINA + 1 }, (_, i) => ({ id: i })),
    );
    const r = await service.listar({ pagina: 3 });
    expect(llamadas).toMatchObject({
      limit: POR_PAGINA + 1,
      offset: 2 * POR_PAGINA,
    });
    expect(r.facturas).toHaveLength(POR_PAGINA);
    expect(r.haySiguiente).toBe(true);
  });

  it('la búsqueda escapa los comodines de LIKE', async () => {
    const { service, llamadas } = setup([]);
    await service.listar({ pagina: 1, busqueda: '50%_x' });
    const { params } = new PgDialect().sqlToQuery(llamadas.where!);
    expect(params).toContain(String.raw`%50\%\_x%`);
  });

  it('valida página y estatus, y es solo del administrador', () => {
    const c = new FacturasAdminController({ listar: jest.fn() } as never);
    expect(() => c.listar(0)).toThrow(BadRequestException);
    expect(() => c.listar(1, 'pagada')).toThrow(BadRequestException);
    expect(Reflect.getMetadata('roles', FacturasAdminController)).toEqual([
      ROLES.ADMIN,
    ]);
  });
});
