import {
  Injectable,
  BadRequestException,
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
  lte,
  sql,
  inArray,
  desc,
  asc,
  or,
  ne,
  ilike,
  type SQL,
} from 'drizzle-orm';
import { ReglasService } from '../reglas/reglas.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

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

  async getAvailableTables(
    fecha: Date,
    duracionMin: number,
    numComensales: number,
  ) {
    if (!fecha || isNaN(fecha.getTime())) {
      throw new BadRequestException(
        'Fecha inválida para consultar disponibilidad de mesas.',
      );
    }

    const allTables = await this.db
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

    const enoughCapacity = allTables.filter(
      (t) => t.capacidad >= numComensales,
    );
    if (enoughCapacity.length === 0) return { available: [], occupied: [] };

    const start = fecha.toISOString();
    const end = new Date(fecha.getTime() + duracionMin * 60000).toISOString();

    const occupiedReservations = await this.db
      .select({ mesaId: reservaciones.mesaId })
      .from(reservaciones)
      .where(
        and(
          inArray(
            reservaciones.mesaId,
            enoughCapacity.map((t) => t.id),
          ),
          or(
            and(
              gte(reservaciones.fechaHora, start),
              lte(reservaciones.fechaHora, end),
            ),
            and(
              lte(reservaciones.fechaHora, end),
              gte(
                sql`${reservaciones.fechaHora} + (interval '1 minute' * ${duracionMin})`,
                start,
              ),
            ),
          ),
          ne(reservaciones.estatus, 'cancelada'),
        ),
      );

    const occupiedIds = new Set(occupiedReservations.map((r) => r.mesaId));
    const available = enoughCapacity
      .filter((t) => !occupiedIds.has(t.id))
      .map((t) => ({ ...t, estado: 'disponible' }));
    const occupied = enoughCapacity
      .filter((t) => occupiedIds.has(t.id))
      .map((t) => ({ ...t, estado: 'ocupada' }));
    return { available, occupied };
  }

  async createReservation(dto: CreateReservationDto) {
    const fecha = new Date(dto.fechaHora);

    // Horario, antelación, comensales y días especiales, en la hora local del restaurante (Fase 3).
    await this.reglas.validarReserva(fecha, dto.numComensales);

    const config = await this.getRestaurantConfig();
    const duracionDefault = config.duracionReservaDefault;
    const diasConfirmacion = config.diasConfirmacion;

    let mesaId = dto.mesaId;
    if (!mesaId) {
      const available = await this.getAvailableTables(
        fecha,
        duracionDefault,
        dto.numComensales,
      );
      if (available.available.length === 0)
        throw new BadRequestException('No hay mesas disponibles');
      mesaId = available.available[0].id;
    } else {
      const available = await this.getAvailableTables(
        fecha,
        duracionDefault,
        dto.numComensales,
      );
      if (!available.available.some((t) => t.id === mesaId)) {
        throw new BadRequestException(
          `Esa mesa no está libre a esa hora o no tiene lugar para ${dto.numComensales} personas.`,
        );
      }
    }

    const diffDays = (fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const requiereConfirmacion = diffDays <= diasConfirmacion;

    const [newReservation] = await this.db
      .insert(reservaciones)
      .values({
        clienteNombre: dto.clienteNombre,
        clienteTelefono: dto.clienteTelefono,
        clienteEmail: dto.clienteEmail,
        fechaHora: fecha.toISOString(),
        numComensales: dto.numComensales,
        mesaId,
        peticionesEspeciales: dto.peticionesEspeciales || null,
        ocasion: dto.ocasion || null,
        canal: dto.canal || 'web',
        estatus: requiereConfirmacion ? 'pendiente' : 'confirmada',
      })
      .returning();

    return {
      ...newReservation,
      requiereConfirmacion,
      mensaje: requiereConfirmacion
        ? `Reserva creada. Confirma en ${diasConfirmacion} días.`
        : 'Reserva confirmada.',
    };
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

  async getTableMap(fechaHora?: string) {
    let fecha = fechaHora ? new Date(fechaHora) : new Date();
    if (isNaN(fecha.getTime())) fecha = new Date();

    const start = fecha.toISOString();
    const end = new Date(fecha.getTime() + 120 * 60000).toISOString();

    const allTables = await this.db
      .select({
        id: mesas.id,
        numero: mesas.numero,
        capacidad: mesas.capacidad,
        areaId: mesas.areaId,
        areaNombre: areasSalon.nombre,
        posicionX: mesas.posicionX,
        posicionY: mesas.posicionY,
        forma: mesas.forma,
        activa: mesas.activa,
      })
      .from(mesas)
      .leftJoin(areasSalon, eq(mesas.areaId, areasSalon.id))
      .where(eq(mesas.activa, true))
      .orderBy(asc(mesas.numero));

    const occupied = await this.db
      .select({ mesaId: reservaciones.mesaId })
      .from(reservaciones)
      .where(
        and(
          gte(reservaciones.fechaHora, start),
          lte(reservaciones.fechaHora, end),
          ne(reservaciones.estatus, 'cancelada'),
          ne(reservaciones.estatus, 'completada'),
        ),
      );
    const occupiedIds = new Set(occupied.map((r) => r.mesaId));

    return allTables.map((t) => ({
      ...t,
      estado: occupiedIds.has(t.id) ? 'ocupada' : 'disponible',
    }));
  }
}
