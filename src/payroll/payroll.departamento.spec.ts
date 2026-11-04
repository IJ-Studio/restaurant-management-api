import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

import { DEPARTAMENTO_PREDETERMINADO, PayrollService } from './payroll.service';

/** Doble de la BD que registra la condición de búsqueda del departamento. */
function setup(departamentos: { id: number; nombre: string }[]) {
  const condiciones: SQL[] = [];
  const insertados: unknown[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: (c: SQL) => {
          condiciones.push(c);
          return Promise.resolve(departamentos);
        },
      }),
    }),
    insert: () => ({
      values: (v: unknown) => {
        insertados.push(v);
        return { returning: () => Promise.resolve([{ id: 99 }]) };
      },
    }),
  };
  return { service: new PayrollService(db as never), condiciones, insertados };
}

describe('PayrollService: departamento', () => {
  it('busca sin distinguir mayúsculas y reutiliza el existente', async () => {
    const { service, condiciones, insertados } = setup([
      { id: 4, nombre: 'Cocina' },
    ]);
    await service
      .create({
        role: 'COCINERO',
        name: 'ANA',
        weeklyPay: 1000,
        department: 'COCINA',
      })
      .catch(() => undefined);
    const { sql, params } = new PgDialect().sqlToQuery(condiciones[0]);
    expect(sql).toMatch(/lower\(.*\) = lower\(\$1\)/);
    expect(params).toEqual(['COCINA']);
    // No se insertó un departamento nuevo (el primer insert es el puesto).
    expect(insertados[0]).toMatchObject({ departamentoId: 4 });
  });

  it('sin departamento usa GENERAL', async () => {
    const { service, condiciones } = setup([]);
    await service
      .create({ role: 'MESERO', name: 'LUIS', weeklyPay: 900 })
      .catch(() => undefined);
    expect(new PgDialect().sqlToQuery(condiciones[0]).params).toEqual([
      DEPARTAMENTO_PREDETERMINADO,
    ]);
    expect(DEPARTAMENTO_PREDETERMINADO).toBe('GENERAL');
  });
});
