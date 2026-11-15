import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from '../../src/database/drizzle/constants';
import type { DrizzleDB } from '../../src/database/drizzle/drizzle.provider';
import {
  reservaciones,
  mesas,
  areasSalon,
  restaurante,
} from '../../src/database/schema/public.schema';
import {
  eq,
  and,
  gte,
  gt,
  lte,
  lt,
  notInArray,
  sql,
  desc,
  asc,
  ilike,
  type SQL,
} from 'drizzle-orm';
import { ReglasService } from '../reglas/reglas.service';
import { instanteLocal } from '../reglas/horario';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

/** Una reserva en estos estados ya no ocupa la mesa. */
const ESTATUS_QUE_LIBERAN = ['cancelada', 'completada', 'no_show'];

export interface MesaConEstado {
  id: number;
  numero: string;
  capacidad: number;
  areaId: number | null;
  areaNombre: string | null;
  posicionX: number | null;
  posicionY: number | null;
  forma: string | null;
  estado: 'disponible' | 'ocupada' | 'sin-lugar';
  /** Por qué no se puede elegir, para mostrarlo junto a la mesa. */
  motivo: string | null;
}

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly reglas: ReglasService,
  ) {}

  async getRestaurantConfig() {
    const config = await this.db.select().from(restaurante).limit(1);
    if (!config.length)
      throw new BadRequestException('Configuración no encontrada');

    // Columnas que la tabla puede no tener todavía en el esquema de Drizzle.
    const c = config[0] as typeof restaurante.$inferSelect & {
      duracionReservaDefault?: number | null;
      diasConfirmacion?: number | null;
    };

    return {
      ...c,
      duracionReservaDefault: c.duracionReservaDefault || 90,
      diasConfirmacion: c.diasConfirmacion || 3,
    };
  }

  /**
   * Estado de cada mesa activa para una reserva de `numComensales` que empieza en `fecha` y dura
   * `duracionMin`: libre, reservada (solape real con la duración de cada reserva, también las que
   * empezaron antes y siguen en curso) o sin lugar. La usan el plano, la disponibilidad y la
   * creación, para que lo que se ofrece sea lo mismo que se acepta.
   */
  async estadoMesas(
    fecha: Date,
    duracionMin: number,
    numComensales: number,
    db: Pick<DrizzleDB, 'select'> = this.db,
  ): Promise<MesaConEstado[]> {
    if (!fecha || isNaN(fecha.getTime())) {
      throw new BadRequestException(
        'Fecha inválida para consultar disponibilidad de mesas.',
      );
    }

    const allTables = await db
      .select({
        id: mesas.id,
        numero: mesas.numero,
        capacidad: mesas.capacidad,
        areaId: mesas.areaId,
        areaNombre: areasSalon.nombre,
        posicionX: mesas.posicionX,
        posicionY: mesas.posicionY,
        forma: mesas.forma,
      })
      .from(mesas)
      .leftJoin(areasSalon, eq(mesas.areaId, areasSalon.id))
      .where(eq(mesas.activa, true))
      .orderBy(asc(mesas.numero));

    const inicio = fecha.toISOString();
    const fin = new Date(fecha.getTime() + duracionMin * 60000).toISOString();
    // Se cruzan si la otra empieza antes de que acabe esta y acaba después de que esta empiece.
    const ocupadas = await db
      .select({ mesaId: reservaciones.mesaId })
      .from(reservaciones)
      .where(
        and(
          lt(reservaciones.fechaHora, fin),
          gt(
            sql`${reservaciones.fechaHora} + make_interval(mins => coalesce(${reservaciones.duracionMin}, ${duracionMin}))`,
            inicio,
          ),
          notInArray(reservaciones.estatus, ESTATUS_QUE_LIBERAN),
        ),
      );
    const ocupadasIds = new Set(ocupadas.map((r) => r.mesaId));

    return allTables.map((t) => {
      if (t.capacidad < numComensales)
        return {
          ...t,
          estado: 'sin-lugar' as const,
          motivo: `Para ${t.capacidad} ${t.capacidad === 1 ? 'persona' : 'personas'}`,
        };
      if (ocupadasIds.has(t.id))
        return {
          ...t,
          estado: 'ocupada' as const,
          motivo: 'Reservada a esa hora',
        };
      return { ...t, estado: 'disponible' as const, motivo: null };
    });
  }

  async getAvailableTables(
    fecha: Date,
    duracionMin: number,
    numComensales: number,
  ) {
    const todas = await this.estadoMesas(fecha, duracionMin, numComensales);
    return {
      available: todas.filter((t) => t.estado === 'disponible'),
      occupied: todas.filter((t) => t.estado === 'ocupada'),
    };
  }

  async createReservation(dto: CreateReservationDto) {
    const fecha = new Date(dto.fechaHora);

    // Horario, antelación, comensales y días especiales, en la hora local del restaurante (Fase 3).
    await this.reglas.validarReserva(fecha, dto.numComensales);

    const config = await this.getRestaurantConfig();
    const duracionMin = config.duracionReservaDefault;
    const diasConfirmacion = config.diasConfirmacion;
    const diffDays = (fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const requiereConfirmacion = diffDays <= diasConfirmacion;

    const newReservation = await this.db.transaction(async (tx) => {
      // Una creación a la vez: comprobar e insertar sin que otra reserva se cuele en medio.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('reservaciones'))`,
      );
      const todas = await this.estadoMesas(
        fecha,
        duracionMin,
        dto.numComensales,
        tx,
      );
      const mesaId = dto.mesaId
        ? this.mesaElegida(todas, dto.mesaId, dto.numComensales)
        : this.mesaAsignada(todas, dto.numComensales);

      const [creada] = await tx
        .insert(reservaciones)
        .values({
          clienteNombre: dto.clienteNombre,
          clienteTelefono: dto.clienteTelefono,
          clienteEmail: dto.clienteEmail,
          fechaHora: fecha.toISOString(),
          duracionMin,
          numComensales: dto.numComensales,
          mesaId,
          peticionesEspeciales: dto.peticionesEspeciales || null,
          ocasion: dto.ocasion || null,
          canal: dto.canal || 'web',
          estatus: requiereConfirmacion ? 'pendiente' : 'confirmada',
        })
        .returning();
      return creada;
    });

    return {
      ...newReservation,
      requiereConfirmacion,
      mensaje: requiereConfirmacion
        ? `Reserva creada. Confirma en ${diasConfirmacion} días.`
        : 'Reserva confirmada.',
    };
  }

  private mesaElegida(
    todas: MesaConEstado[],
    mesaId: number,
    numComensales: number,
  ): number {
    const mesa = todas.find((t) => t.id === mesaId);
    if (!mesa) throw new BadRequestException('Esa mesa no existe.');
    if (mesa.estado === 'sin-lugar')
      throw new BadRequestException(
        `Esa mesa es para ${mesa.capacidad} personas; elige una para ${numComensales} o más.`,
      );
    if (mesa.estado === 'ocupada')
      throw new ConflictException(
        'Esa mesa ya está reservada a esa hora. Elige otra mesa u otra hora.',
      );
    return mesa.id;
  }

  /** Sin mesa elegida: la libre más pequeña en la que caben (no gasta una mesa grande en dos personas). */
  private mesaAsignada(todas: MesaConEstado[], numComensales: number): number {
    const libre = todas
      .filter((t) => t.estado === 'disponible')
      .sort((x, y) => x.capacidad - y.capacidad)[0];
    if (!libre)
      throw new ConflictException(
        `No quedan mesas libres para ${numComensales} personas a esa hora. Prueba otra hora.`,
      );
    return libre.id;
  }

  async findAll(filters: {
    fechaDesde?: string;
    fechaHasta?: string;
    estatus?: string;
    clienteNombre?: string;
  }) {
    // Las condiciones se combinan con AND: encadenar `.where()` dejaba solo la última.
    const conditions: SQL[] = [];
    const from = filters.fechaDesde ? new Date(filters.fechaDesde) : null;
    if (from && !isNaN(from.getTime())) {
      conditions.push(gte(reservaciones.fechaHora, from.toISOString()));
    }
    const to = filters.fechaHasta ? new Date(filters.fechaHasta) : null;
    if (to && !isNaN(to.getTime())) {
      conditions.push(lte(reservaciones.fechaHora, to.toISOString()));
    }
    if (filters.estatus) {
      conditions.push(eq(reservaciones.estatus, filters.estatus));
    }
    if (filters.clienteNombre) {
      // `%` y `_` del texto se buscan tal cual, no como comodines.
      const nombre = filters.clienteNombre.replace(/[\\%_]/g, '\\$&');
      conditions.push(ilike(reservaciones.clienteNombre, `%${nombre}%`));
    }
    return await this.db
      .select()
      .from(reservaciones)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(reservaciones.fechaHora));
  }

  async findOne(id: string) {
    const res = await this.db
      .select()
      .from(reservaciones)
      .where(eq(reservaciones.id, id))
      .limit(1);
    if (!res.length) throw new NotFoundException('Reserva no encontrada');
    return res[0];
  }

  async update(id: string, dto: UpdateReservationDto, autorId?: number) {
    await this.findOne(id);
    const cancela = dto.estatus === 'cancelada';
    if (cancela && !dto.motivoCancelacion) {
      throw new BadRequestException('Escribe el motivo de la cancelación.');
    }
    const [updated] = await this.db
      .update(reservaciones)
      .set({
        estatus: dto.estatus,
        notas: dto.notas,
        numComensales: dto.numComensales,
        fechaHora: dto.fechaHora,
        mesaId: dto.mesaId,
        recordatorioEnviado: dto.recordatorioEnviado,
        ...(cancela
          ? {
              motivoCancelacion: dto.motivoCancelacion,
              canceladoPor: autorId ?? null,
              canceladoEn: new Date().toISOString(),
            }
          : {}),
        actualizadoEn: new Date().toISOString(),
      })
      .where(eq(reservaciones.id, id))
      .returning();
    return updated;
  }

  /**
   * Plano de mesas para una hora. `fechaHora` sin zona («2026-11-15T14:30») es la hora del
   * restaurante, no la del servidor (UTC en Render); con zona se respeta. Mismas reglas que al crear.
   */
  async getTableMap(fechaHora?: string, numComensales = 1) {
    const config = await this.getRestaurantConfig();
    const local = fechaHora
      ? /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2}(\.\d+)?)?$/.exec(fechaHora)
      : null;
    // Date.UTC desborda «02-30» o «99:99» a otra fecha válida: se exige que exista tal cual.
    const dia = local ? new Date(`${local[1]}T${local[2]}:00Z`) : null;
    if (
      local &&
      (isNaN(dia!.getTime()) ||
        dia!.toISOString().slice(0, 16) !== `${local[1]}T${local[2]}`)
    ) {
      throw new BadRequestException('Esa fecha u hora no existe.');
    }
    const fecha = !fechaHora
      ? new Date()
      : local
        ? instanteLocal(
            local[1],
            local[2],
            config.zonaHoraria || 'America/Mexico_City',
          )
        : new Date(fechaHora);
    return this.estadoMesas(
      fecha,
      config.duracionReservaDefault,
      numComensales,
    );
  }
}
