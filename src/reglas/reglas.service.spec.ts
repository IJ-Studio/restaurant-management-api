import { BadRequestException } from '@nestjs/common';

import { desfaseUtcMin, horarioDelDia, momentoLocal } from './horario';
import { MENSAJES, ReglasService, type Reglas } from './reglas.service';

const TZ = 'America/Mexico_City';
const semana = Array.from({ length: 7 }, (_, dia) => ({
  dia,
  apertura: '08:00:00',
  cierre: '22:00:00',
  cocinaCierre: '21:30:00',
  cerrado: dia === 1, // lunes cerrado
}));
const reglas = (overrides: Partial<Reglas> = {}): Reglas => ({
  zonaHoraria: TZ,
  utcOffsetMin: -360,
  aceptaReservas: true,
  reservas: {
    anticipacionMin: 60,
    margenCierreMin: 30,
    comensalesMax: 50,
    duracionMin: 90,
  },
  pedidos: { cantidadMaxPorPlatillo: 99 },
  horario: semana,
  diasEspeciales: [],
  ...overrides,
});

// Viernes 13-nov-2026, 12:00 en Ciudad de México (UTC−6) = 18:00 UTC.
const AHORA = new Date('2026-11-13T18:00:00Z');
const enMexico = (fechaHora: string) => new Date(`${fechaHora}-06:00`);

function setup(r = reglas()) {
  const service = new ReglasService({} as never);
  jest.spyOn(service, 'obtener').mockResolvedValue(r);
  return service;
}

describe('momentoLocal', () => {
  it('usa la hora del restaurante, no la del servidor (UTC)', () => {
    // 02:00 UTC del sábado = 20:00 del viernes en México.
    expect(momentoLocal(new Date('2026-11-14T02:00:00Z'), TZ)).toEqual({
      fecha: '2026-11-13',
      dia: 5,
      minutos: 20 * 60,
    });
  });
});

describe('desfaseUtcMin', () => {
  it('Ciudad de México va 6 horas detrás de UTC (sin horario de verano)', () => {
    expect(desfaseUtcMin(AHORA, TZ)).toBe(-360);
  });

  it('funciona también de noche, cuando en UTC ya es el día siguiente', () => {
    expect(desfaseUtcMin(new Date('2026-11-14T03:30:00Z'), TZ)).toBe(-360);
  });
});

describe('horarioDelDia', () => {
  it('un día especial cerrado manda sobre el horario semanal', () => {
    const momento = momentoLocal(enMexico('2026-11-20T13:00:00'), TZ);
    expect(
      horarioDelDia(momento, semana, [
        { fecha: '2026-11-20', cerrado: true, apertura: null, cierre: null },
      ]),
    ).toBeNull();
  });

  it('un día especial puede cambiar el horario', () => {
    const momento = momentoLocal(enMexico('2026-11-20T13:00:00'), TZ);
    expect(
      horarioDelDia(momento, semana, [
        {
          fecha: '2026-11-20',
          cerrado: false,
          apertura: '12:00',
          cierre: '18:00',
        },
      ]),
    ).toMatchObject({ apertura: '12:00', cierre: '18:00' });
  });
});

describe('ReglasService.validarReserva', () => {
  const rechaza = (promesa: Promise<void>, mensaje: string) =>
    expect(promesa).rejects.toThrow(new BadRequestException(mensaje));

  it('acepta una reservación a las 20:00 del mismo día (hora de México)', async () => {
    await expect(
      setup().validarReserva(enMexico('2026-11-13T20:00:00'), 4, AHORA),
    ).resolves.toBeUndefined();
  });

  it('rechaza a las 2 a. m.', async () => {
    await rechaza(
      setup().validarReserva(enMexico('2026-11-14T02:00:00'), 2, AHORA),
      MENSAJES.fueraDeHorario('08:00:00', '22:00:00', 30),
    );
  });

  it('rechaza menos de 30 minutos antes del cierre', async () => {
    await rechaza(
      setup().validarReserva(enMexico('2026-11-13T21:45:00'), 2, AHORA),
      MENSAJES.fueraDeHorario('08:00:00', '22:00:00', 30),
    );
  });

  it('rechaza con menos de 1 hora de anticipación', async () => {
    await rechaza(
      setup().validarReserva(enMexico('2026-11-13T12:30:00'), 2, AHORA),
      MENSAJES.anticipacion(60),
    );
  });

  it('rechaza una fecha pasada', async () => {
    await rechaza(
      setup().validarReserva(enMexico('2026-11-13T09:00:00'), 2, AHORA),
      MENSAJES.pasada,
    );
  });

  it('rechaza un día de descanso', async () => {
    await rechaza(
      setup().validarReserva(enMexico('2026-11-16T14:00:00'), 2, AHORA),
      MENSAJES.cerrado,
    );
  });

  it.each([0, 51, 2.5])('rechaza %s personas', async (personas) => {
    await rechaza(
      setup().validarReserva(enMexico('2026-11-14T14:00:00'), personas, AHORA),
      MENSAJES.comensales(50),
    );
  });

  it('respeta la antelación configurada por el administrador', async () => {
    const service = setup(
      reglas({
        reservas: {
          anticipacionMin: 180,
          margenCierreMin: 30,
          comensalesMax: 50,
          duracionMin: 90,
        },
      }),
    );
    await rechaza(
      service.validarReserva(enMexico('2026-11-13T14:00:00'), 2, AHORA),
      MENSAJES.anticipacion(180),
    );
  });

  it('si el restaurante no toma reservaciones lo dice', async () => {
    await rechaza(
      setup(reglas({ aceptaReservas: false })).validarReserva(
        enMexico('2026-11-14T14:00:00'),
        2,
        AHORA,
      ),
      MENSAJES.sinReservas,
    );
  });
});

describe('ReglasService.validarCocinaAbierta', () => {
  it('a mediodía cocina recibe pedidos', async () => {
    await expect(setup().validarCocinaAbierta(AHORA)).resolves.toBeUndefined();
  });

  it('después del cierre de cocina no', async () => {
    await expect(
      setup().validarCocinaAbierta(enMexico('2026-11-13T21:40:00')),
    ).rejects.toThrow(MENSAJES.cocinaCerrada('08:00:00', '21:30:00'));
  });

  it('un día de descanso no', async () => {
    await expect(
      setup().validarCocinaAbierta(enMexico('2026-11-16T13:00:00')),
    ).rejects.toThrow(MENSAJES.cocinaCerradaHoy);
  });
});

describe('MENSAJES.anticipacion', () => {
  it.each([
    [60, 'Las reservaciones se hacen con al menos 1 hora de anticipación.'],
    [120, 'Las reservaciones se hacen con al menos 2 horas de anticipación.'],
    [45, 'Las reservaciones se hacen con al menos 45 minutos de anticipación.'],
  ])('%s min', (min, texto) => {
    expect(MENSAJES.anticipacion(min)).toBe(texto);
  });
});
