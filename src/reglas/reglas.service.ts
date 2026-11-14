import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq, gte } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  horarios,
  horariosEspeciales,
  restaurante,
  systemSettings,
} from '../database/schema/public.schema';
import {
  aMinutos,
  desfaseUtcMin,
  hhmm,
  horarioDelDia,
  momentoLocal,
  type DiaEspecial,
  type DiaHorario,
} from './horario';

/** Valores por defecto; el administrador puede cambiarlos con la clave `reglas_operacion` de `system_settings`. */
export const REGLAS_POR_DEFECTO = {
  reservas: { anticipacionMin: 60, margenCierreMin: 30, comensalesMax: 50 },
  pedidos: { cantidadMaxPorPlatillo: 99 },
};

export interface Reglas {
  zonaHoraria: string;
  /** Desfase actual respecto de UTC, para que los clientes calculen la hora local sin depender de su zona. */
  utcOffsetMin: number;
  aceptaReservas: boolean;
  reservas: {
    anticipacionMin: number;
    margenCierreMin: number;
    comensalesMax: number;
    duracionMin: number;
  };
  pedidos: { cantidadMaxPorPlatillo: number };
  horario: DiaHorario[];
  diasEspeciales: DiaEspecial[];
}

// Los mensajes son los mismos que muestra la app antes de enviar: el cliente y el servidor dicen lo mismo.
export const MENSAJES = {
  sinReservas: 'Por ahora el restaurante no está tomando reservaciones.',
  pasada: 'La fecha ya pasó.',
  anticipacion: (min: number) =>
    `Las reservaciones se hacen con al menos ${min >= 60 && min % 60 === 0 ? `${min / 60} ${min === 60 ? 'hora' : 'horas'}` : `${min} minutos`} de anticipación.`,
  cerrado: 'El restaurante está cerrado ese día.',
  fueraDeHorario: (apertura: string, cierre: string, margen: number) =>
    `Reservaciones de ${hhmm(apertura)} a ${hhmm(cierre)}, al menos ${margen} minutos antes del cierre.`,
  comensales: (max: number) => `El número de personas debe ser de 1 a ${max}.`,
  cocinaCerrada: (apertura: string, cocinaCierre: string) =>
    `Cocina recibe pedidos de ${hhmm(apertura)} a ${hhmm(cocinaCierre)}.`,
  cocinaCerradaHoy: 'El restaurante está cerrado hoy: no se reciben pedidos.',
};

/** Reglas de operación centralizadas (Fase 3): las usan el API, la app y la web. */
@Injectable()
export class ReglasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async obtener(ahora = new Date()): Promise<Reglas> {
    const [config] = await this.db.select().from(restaurante).limit(1);
    const zonaHoraria = config?.zonaHoraria || 'America/Mexico_City';
    const [ajuste] = await this.db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, 'reglas_operacion'))
      .limit(1);
    const propio = (ajuste?.value ?? {}) as Partial<typeof REGLAS_POR_DEFECTO>;

    const semana = await this.db.select().from(horarios);
    const especiales = await this.db
      .select()
      .from(horariosEspeciales)
      .where(
        gte(horariosEspeciales.fecha, momentoLocal(ahora, zonaHoraria).fecha),
      );

    return {
      zonaHoraria,
      utcOffsetMin: desfaseUtcMin(ahora, zonaHoraria),
      aceptaReservas: config?.aceptaReservas !== false,
      reservas: {
        ...REGLAS_POR_DEFECTO.reservas,
        ...propio.reservas,
        duracionMin: config?.duracionReservaDefault || 90,
      },
      pedidos: { ...REGLAS_POR_DEFECTO.pedidos, ...propio.pedidos },
      horario: semana
        .map((d) => ({
          dia: d.diaSemana,
          apertura: d.apertura,
          cierre: d.cierre,
          cocinaCierre: d.horaCocinaCierre,
          cerrado: d.cerrado === true,
        }))
        .sort((a, b) => a.dia - b.dia),
      diasEspeciales: especiales.map((e) => ({
        fecha: e.fecha,
        cerrado: e.cerrado === true,
        apertura: e.apertura ?? null,
        cierre: e.cierre ?? null,
      })),
    };
  }

  /** Lanza 400 con el motivo si la reservación no cumple las reglas. */
  async validarReserva(
    fecha: Date,
    numComensales: number,
    ahora = new Date(),
  ): Promise<void> {
    if (isNaN(fecha.getTime())) {
      throw new BadRequestException(
        'La fecha y hora de la reserva no es válida.',
      );
    }
    const reglas = await this.obtener(ahora);
    const { anticipacionMin, margenCierreMin, comensalesMax } = reglas.reservas;
    if (!reglas.aceptaReservas)
      throw new BadRequestException(MENSAJES.sinReservas);
    if (
      !Number.isInteger(numComensales) ||
      numComensales < 1 ||
      numComensales > comensalesMax
    ) {
      throw new BadRequestException(MENSAJES.comensales(comensalesMax));
    }
    if (fecha.getTime() <= ahora.getTime())
      throw new BadRequestException(MENSAJES.pasada);
    if (fecha.getTime() - ahora.getTime() < anticipacionMin * 60_000) {
      throw new BadRequestException(MENSAJES.anticipacion(anticipacionMin));
    }

    const momento = momentoLocal(fecha, reglas.zonaHoraria);
    const dia = horarioDelDia(momento, reglas.horario, reglas.diasEspeciales);
    if (!dia) throw new BadRequestException(MENSAJES.cerrado);
    if (
      momento.minutos < aMinutos(dia.apertura) ||
      momento.minutos > aMinutos(dia.cierre) - margenCierreMin
    ) {
      throw new BadRequestException(
        MENSAJES.fueraDeHorario(dia.apertura, dia.cierre, margenCierreMin),
      );
    }
  }

  /** Lanza 400 si cocina no está recibiendo pedidos en este momento. */
  async validarCocinaAbierta(ahora = new Date()): Promise<void> {
    const reglas = await this.obtener(ahora);
    const momento = momentoLocal(ahora, reglas.zonaHoraria);
    const dia = horarioDelDia(momento, reglas.horario, reglas.diasEspeciales);
    if (!dia) throw new BadRequestException(MENSAJES.cocinaCerradaHoy);
    if (
      momento.minutos < aMinutos(dia.apertura) ||
      momento.minutos >= aMinutos(dia.cocinaCierre)
    ) {
      throw new BadRequestException(
        MENSAJES.cocinaCerrada(dia.apertura, dia.cocinaCierre),
      );
    }
  }
}
