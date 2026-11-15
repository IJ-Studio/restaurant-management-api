import { BadRequestException } from '@nestjs/common';

import { ReservationsService } from './reservations.service';

// El plano interpreta la hora sin zona en la del restaurante, con independencia de la del servidor.
function setup() {
  const service = new ReservationsService({} as never, {} as never);
  jest.spyOn(service, 'getRestaurantConfig').mockResolvedValue({
    zonaHoraria: 'America/Mexico_City',
    duracionReservaDefault: 90,
  } as never);
  const estado = jest.spyOn(service, 'estadoMesas').mockResolvedValue([]);
  return { service, estado };
}

describe('GET /reservations/map: hora del restaurante', () => {
  it.each([
    ['2026-11-15T14:30', '2026-11-15T20:30:00.000Z'],
    ['2026-11-15T14:30:00', '2026-11-15T20:30:00.000Z'],
    ['2026-11-15T23:30', '2026-11-16T05:30:00.000Z'],
    // Con zona explícita se respeta tal cual.
    ['2026-11-15T20:30:00.000Z', '2026-11-15T20:30:00.000Z'],
  ])('%s → %s, con 90 min y los comensales pedidos', async (entrada, utc) => {
    const { service, estado } = setup();
    await service.getTableMap(entrada, 4);
    const [fecha, duracion, personas] = estado.mock.calls[0];
    expect(fecha.toISOString()).toBe(utc);
    expect(duracion).toBe(90);
    expect(personas).toBe(4);
  });

  it.each(['2026-02-30T10:00', '2026-13-45T10:00', '2026-11-15T24:00'])(
    'rechaza la fecha u hora inexistente %s sin desbordarla',
    async (entrada) => {
      const { service, estado } = setup();
      await expect(service.getTableMap(entrada)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(estado).not.toHaveBeenCalled();
    },
  );
});
