import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { createWhitelistPipe } from '../common/config/validation.config';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationsService } from './reservations.service';

function setup() {
  const set = jest.fn().mockReturnValue({
    where: () => ({ returning: () => Promise.resolve([{ id: 'r1' }]) }),
  });
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([{ id: 'r1' }]) }),
      }),
    }),
    update: () => ({ set }),
  };
  return { service: new ReservationsService(db as never), set };
}

describe('PATCH /reservations/:id: motivo de cancelación (Prioridad 3.3)', () => {
  it('cancelar sin motivo responde 400 y no escribe', async () => {
    const { service, set } = setup();
    await expect(
      service.update('r1', { estatus: 'cancelada' }, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(set).not.toHaveBeenCalled();
  });

  it('con motivo guarda motivo, autor y fecha', async () => {
    const { service, set } = setup();
    await service.update(
      'r1',
      { estatus: 'cancelada', motivoCancelacion: 'EL CLIENTE LLAMÓ' },
      4,
    );
    expect(set.mock.calls[0][0]).toMatchObject({
      estatus: 'cancelada',
      motivoCancelacion: 'EL CLIENTE LLAMÓ',
      canceladoPor: 4,
      canceladoEn: expect.any(String),
    });
  });

  it('la lista blanca quita columnas no declaradas (antes llegaban a .set())', async () => {
    const pipe: ValidationPipe = createWhitelistPipe();
    const limpio = (await pipe.transform(
      { estatus: 'confirmada', noShow: true, depositoPagado: 999 },
      { type: 'body', metatype: UpdateReservationDto },
    )) as Record<string, unknown>;
    expect(limpio).toEqual({ estatus: 'confirmada' });
  });
});
