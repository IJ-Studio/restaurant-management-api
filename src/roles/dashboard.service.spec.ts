import { recalcular } from '../common/calculo';
import { DashboardService } from './dashboard.service';

/** Consulta encadenada de Drizzle que resuelve, en orden, cada resultado de `respuestas`. */
function dbCon(respuestas: unknown[]) {
  const cadena = (): unknown =>
    new Proxy(() => undefined, {
      get: (_, prop) =>
        prop === 'then'
          ? (ok: (v: unknown) => void) => ok(respuestas.shift())
          : cadena,
      apply: () => cadena(),
    });
  return { select: () => cadena() };
}

describe('indicadores del inicio del admin', () => {
  it('cada cifra trae su desglose y se rehace desde él (P1.4)', async () => {
    const db = dbCon([
      [
        { hora: 13, total: 250.5 },
        { hora: 14, total: 100 },
      ],
      [{ count: 3 }],
      [{ count: 2 }],
      [{ count: 1 }],
      [{ count: 0 }],
    ]);
    const mapa = [
      { numero: 'S01', estado: 'ocupada' },
      { numero: 'S02', estado: 'disponible' },
      { numero: 'T01', estado: 'ocupada' },
    ];
    const s = new DashboardService(
      db as never,
      { getTableMap: () => Promise.resolve(mapa) } as never,
    );
    const r = await s.getAdminStats();
    expect(r.totalVentas).toBe(350.5);
    expect(recalcular(r.calculos.totalVentas)).toBe(r.totalVentas);
    expect(r.calculos.totalVentas.datos).toEqual([
      { clave: '13:00 a 13:59', valor: 250.5 },
      { clave: '14:00 a 14:59', valor: 100 },
    ]);
    expect(recalcular(r.calculos.pedidosPendientes)).toBe(r.pedidosPendientes);
    expect(recalcular(r.calculos.pedidosEnPreparacion)).toBe(
      r.pedidosEnPreparacion,
    );
    expect(recalcular(r.calculos.pedidosListos)).toBe(r.pedidosListos);
    expect(recalcular(r.calculos.pedidosPorCobrar)).toBe(r.pedidosPorCobrar);
    expect(recalcular(r.calculos.mesasOcupadas)).toBe(r.mesasOcupadas);
    expect(r.calculos.mesasOcupadas.datos.map((d) => d.clave)).toEqual([
      'Mesa S01',
      'Mesa T01',
    ]);
  });
});
