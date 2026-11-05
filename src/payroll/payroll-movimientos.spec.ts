import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ROLES } from '../common/constants/roles';
import { CrearMovimientoNominaDto } from './dto/movimiento-nomina.dto';
import { PayrollMovimientosController } from './payroll-movimientos.controller';
import { PayrollMovimientosService } from './payroll-movimientos.service';

const valido = {
  empleadoId: '5f0c8a5e-4a43-4b7e-9d1c-2f3e4a5b6c7d',
  tipo: 'resta',
  concepto: 'objeto_roto',
  monto: 150.5,
  periodoInicio: '2026-11-02',
  periodoFin: '2026-11-08',
  justificacion: 'Rompió una copa',
};
const errores = async (cuerpo: object) =>
  (await validate(plainToInstance(CrearMovimientoNominaDto, cuerpo))).map(
    (e) => e.property,
  );

describe('nómina: sumas y restas (Prioridad 3.1)', () => {
  it('exige justificación, monto positivo y un concepto del catálogo', async () => {
    expect(await errores(valido)).toEqual([]);
    expect(await errores({ ...valido, justificacion: '   ' })).toContain(
      'justificacion',
    );
    expect(await errores({ ...valido, monto: 0 })).toContain('monto');
    // «correccion» solo la pone el API al corregir.
    expect(await errores({ ...valido, concepto: 'correccion' })).toContain(
      'concepto',
    );
  });

  it('una corrección no se corrige y un movimiento solo se corrige una vez', async () => {
    const original = { id: 1, corrigeId: 9, tipo: 'suma', monto: '10.00' };
    const db = {
      select: () => ({
        from: () => ({ where: () => Promise.resolve([original]) }),
      }),
    };
    await expect(
      new PayrollMovimientosService(db as never).corregir(1, 'motivo largo', 1),
    ).rejects.toBeInstanceOf(ConflictException);

    const db2 = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([{ ...original, corrigeId: null }]),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: () =>
            Promise.reject(
              Object.assign(new Error('duplicado'), {
                cause: { code: '23505' },
              }),
            ),
        }),
      }),
    };
    await expect(
      new PayrollMovimientosService(db2 as never).corregir(
        1,
        'motivo largo',
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('el neto se recalcula exactamente desde el desglose («Ver cálculo»)', async () => {
    let llamada = 0;
    const filas = [
      [{ empleadoId: 'e1', nombre: 'ANA', puesto: 'MESERA', base: '800.00' }],
      [
        {
          id: 1,
          empleadoId: 'e1',
          tipo: 'suma',
          concepto: 'bono',
          monto: '0.10',
        },
        {
          id: 2,
          empleadoId: 'e1',
          tipo: 'suma',
          concepto: 'propina',
          monto: '0.20',
        },
        {
          id: 3,
          empleadoId: 'e1',
          tipo: 'resta',
          concepto: 'consumo',
          monto: '45.35',
        },
      ],
    ];
    const cadena = () => {
      const r = filas[llamada++];
      const c = {
        from: () => c,
        leftJoin: () => c,
        where: () => c,
        orderBy: () => Promise.resolve(r),
        then: (f: (v: unknown) => unknown) => Promise.resolve(r).then(f),
      };
      return c;
    };
    const db = { select: cadena };
    const [p] = await new PayrollMovimientosService(db as never).resumen(
      '2026-11-02',
      '2026-11-08',
    );
    expect(p).toMatchObject({
      base: 800,
      sumas: 0.3,
      restas: 45.35,
      neto: 754.95,
    });
    const recalculado =
      p.calculo.datos.reduce((s, d) => s + Math.round(d.valor * 100), 0) / 100;
    expect(recalculado).toBe(p.neto);
  });

  it('solo el administrador', () => {
    expect(Reflect.getMetadata('roles', PayrollMovimientosController)).toEqual([
      ROLES.ADMIN,
    ]);
  });
});
