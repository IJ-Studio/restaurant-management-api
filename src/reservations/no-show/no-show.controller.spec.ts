import { NotFoundException } from '@nestjs/common';

import { NoShowController } from './no-show.controller';

describe('NoShowController: interruptor de configuración (Prioridad 3.5)', () => {
  const entorno = process.env.PREDICCION_NO_SHOW_ACTIVA;
  afterEach(() => {
    process.env.PREDICCION_NO_SHOW_ACTIVA = entorno;
  });
  const servicio = {
    getRiskForReservation: jest.fn().mockResolvedValue({ probabilidad: 0.2 }),
    getModelMetrics: jest.fn().mockResolvedValue({}),
  };
  const controlador = new NoShowController(servicio as never);

  it('desactivada por defecto: 404 y el modelo no se usa ni se entrena', async () => {
    delete process.env.PREDICCION_NO_SHOW_ACTIVA;
    expect(controlador.estado()).toEqual({ activa: false });
    await expect(controlador.getRisk('r1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(servicio.getRiskForReservation).not.toHaveBeenCalled();
  });

  it('con PREDICCION_NO_SHOW_ACTIVA=true responde como antes', async () => {
    process.env.PREDICCION_NO_SHOW_ACTIVA = 'true';
    expect(controlador.estado()).toEqual({ activa: true });
    await expect(controlador.getRisk('r1')).resolves.toEqual({
      probabilidad: 0.2,
    });
  });
});
