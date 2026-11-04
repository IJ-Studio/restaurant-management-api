import { ConflictException, NotFoundException } from '@nestjs/common';

import { archivarYBorrar, limpiarMotivo } from './archivar';
import { RegistrosEliminadosService } from './registros-eliminados.service';

describe('registros eliminados', () => {
  it('el motivo se guarda en mayúsculas, sin espacios de sobra; vacío es null', () => {
    expect(limpiarMotivo('  plato   duplicado ')).toBe('PLATO DUPLICADO');
    expect(limpiarMotivo('   ')).toBeNull();
    expect(limpiarMotivo(undefined)).toBeNull();
    expect(limpiarMotivo('x'.repeat(400))).toHaveLength(300);
  });

  it('archivarYBorrar devuelve cuántas filas dio de baja', async () => {
    const db = { execute: jest.fn().mockResolvedValue([{ id: 1 }]) };
    await expect(archivarYBorrar(db as never, 'platillos', 7)).resolves.toBe(1);
    db.execute.mockResolvedValue([]);
    await expect(archivarYBorrar(db as never, 'platillos', 8)).resolves.toBe(0);
  });

  function servicioCon(registro: unknown) {
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: () => Promise.resolve(registro ? [registro] : []),
          }),
        }),
      }),
      execute: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnValue({
        set: () => ({ where: () => Promise.resolve() }),
      }),
    };
    const db = { transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    return { servicio: new RegistrosEliminadosService(db as never), tx };
  }

  it('restaurar: 404 si no existe, 409 si ya se restauró o si la tabla no está permitida', async () => {
    await expect(
      servicioCon(null).servicio.restaurar(1, 2),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      servicioCon({
        tablaOrigen: 'platillos',
        restauradoEn: '2026-11-04',
        datos: {},
      }).servicio.restaurar(1, 2),
    ).rejects.toBeInstanceOf(ConflictException);
    const ajena = servicioCon({
      tablaOrigen: 'pagos',
      restauradoEn: null,
      datos: {},
    });
    await expect(ajena.servicio.restaurar(1, 2)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(ajena.tx.execute).not.toHaveBeenCalled();
  });

  it('restaurar: inserta la fila archivada y marca quién la restauró', async () => {
    const { servicio, tx } = servicioCon({
      tablaOrigen: 'platillos',
      restauradoEn: null,
      datos: { id: 7 },
    });
    await expect(servicio.restaurar(1, 2)).resolves.toEqual({ success: true });
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledTimes(1);
  });
});
