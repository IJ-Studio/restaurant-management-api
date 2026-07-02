import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../src/database/drizzle/constants';
import type { DrizzleDB } from '../../src/database/drizzle/drizzle.provider';
import { reservaciones, mesas, areasSalon, horarios, horariosEspeciales, restaurante } from '../../src/database/schema/public.schema';
import { eq, and, gte, lte, sql, inArray, desc, asc, or, ne } from 'drizzle-orm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getRestaurantConfig() {
    const config = await this.db.select().from(restaurante).limit(1);
    if (!config.length) throw new BadRequestException('Configuración no encontrada');

    // Forzamos a TypeScript a tratar 'c' como "cualquier objeto"
    // para que te deje leer las propiedades nuevas sin chistar
    const c = config[0] as any;

    return {
      ...c,
      duracionReservaDefault: c.duracionReservaDefault || 90,
      diasConfirmacion: c.diasConfirmacion || 3,
    };
  }

  async validateBusinessHours(fecha: Date): Promise<boolean> {
    // Validación defensiva por si el objeto Date quedó corrupto o inválido
    if (!fecha || isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha y hora de la reserva no es válida.');
    }

    const diaSemana = fecha.getDay();
    const horaStr = fecha.toTimeString().slice(0, 5);

    // Extraemos de forma segura el formato YYYY-MM-DD sin usar .toISOString() directamente
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const fechaHoyStr = `${anio}-${mes}-${dia}`;

    const specialDay = await this.db
      .select()
      .from(horariosEspeciales)
      .where(eq(horariosEspeciales.fecha, fechaHoyStr))
      .limit(1);
    if (specialDay.length && specialDay[0].cerrado) {
      throw new BadRequestException('El restaurante está cerrado este día (día especial)');
    }

    const schedule = await this.db
      .select()
      .from(horarios)
      .where(eq(horarios.diaSemana, diaSemana))
      .limit(1);
    if (!schedule.length || schedule[0].cerrado) {
      throw new BadRequestException('El restaurante está cerrado este día de la semana');
    }

    const { apertura, cierre } = schedule[0];
    if (!apertura || !cierre) throw new BadRequestException('Horario no definido para este día');

    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const horaMin = toMinutes(horaStr);
    const aperturaMin = toMinutes(apertura);
    const cierreMin = toMinutes(cierre);

    const margen = 30;
    if (horaMin < aperturaMin || horaMin > cierreMin - margen) {
      throw new BadRequestException(
        `El horario de atención es de ${apertura} a ${cierre}. Las reservas deben ser al menos ${margen} min antes del cierre.`
      );
    }
    return true;
  }

  async getAvailableTables(fecha: Date, duracionMin: number, numComensales: number) {
    if (!fecha || isNaN(fecha.getTime())) {
      throw new BadRequestException('Fecha inválida para consultar disponibilidad de mesas.');
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

    const enoughCapacity = allTables.filter(t => t.capacidad >= numComensales);
    if (enoughCapacity.length === 0) return { available: [], occupied: [] };

    const start = fecha.toISOString();
    const end = new Date(fecha.getTime() + duracionMin * 60000).toISOString();

    const occupiedReservations = await this.db
      .select({ mesaId: reservaciones.mesaId })
      .from(reservaciones)
      .where(
        and(
          inArray(reservaciones.mesaId, enoughCapacity.map(t => t.id)),
          or(
            and(
              gte(reservaciones.fechaHora, start),
              lte(reservaciones.fechaHora, end)
            ),
            and(
              lte(reservaciones.fechaHora, end),
              gte(sql`${reservaciones.fechaHora} + (interval '1 minute' * ${duracionMin})`, start)
            )
          ),
          ne(reservaciones.estatus, 'cancelada')
        )
      );

    const occupiedIds = new Set(occupiedReservations.map(r => r.mesaId));
    const available = enoughCapacity.filter(t => !occupiedIds.has(t.id)).map(t => ({ ...t, estado: 'disponible' }));
    const occupied = enoughCapacity.filter(t => occupiedIds.has(t.id)).map(t => ({ ...t, estado: 'ocupada' }));
    return { available, occupied };
  }

  async createReservation(dto: CreateReservationDto) {
    const fecha = new Date(dto.fechaHora);

    if (isNaN(fecha.getTime())) {
      throw new BadRequestException('El formato de fechaHora enviado no es válido para JavaScript.');
    }

    if (fecha < new Date()) throw new BadRequestException('Fecha debe ser futura');
    if (fecha.getTime() - Date.now() < 60 * 60 * 1000) {
      throw new BadRequestException('Las reservas deben ser con al menos 1 hora de anticipación');
    }

    await this.validateBusinessHours(fecha);

    const config = await this.getRestaurantConfig();
    const duracionDefault = config.duracionReservaDefault;
    const diasConfirmacion = config.diasConfirmacion;

    let mesaId = dto.mesaId;
    if (!mesaId) {
      const available = await this.getAvailableTables(fecha, duracionDefault, dto.numComensales);
      if (available.available.length === 0) throw new BadRequestException('No hay mesas disponibles');
      mesaId = available.available[0].id;
    } else {
      const available = await this.getAvailableTables(fecha, duracionDefault, dto.numComensales);
      if (!available.available.some(t => t.id === mesaId)) {
        throw new BadRequestException('Mesa no disponible');
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

  async findAll(filters: { fechaDesde?: string; fechaHasta?: string; estatus?: string; clienteNombre?: string }) {
    let query = this.db.select().from(reservaciones).$dynamic();
    if (filters.fechaDesde) {
      const from = new Date(filters.fechaDesde);
      if (!isNaN(from.getTime())) {
        query = query.where(gte(reservaciones.fechaHora, from.toISOString()));
      }
    }
    if (filters.fechaHasta) {
      const to = new Date(filters.fechaHasta);
      if (!isNaN(to.getTime())) {
        query = query.where(lte(reservaciones.fechaHora, to.toISOString()));
      }
    }
    if (filters.estatus) {
      query = query.where(eq(reservaciones.estatus, filters.estatus));
    }
    if (filters.clienteNombre) {
      query = query.where(sql`${reservaciones.clienteNombre} ILIKE ${'%' + filters.clienteNombre + '%'}`);
    }
    return await query.orderBy(desc(reservaciones.fechaHora));
  }

  async findOne(id: string) {
    const res = await this.db.select().from(reservaciones).where(eq(reservaciones.id, id)).limit(1);
    if (!res.length) throw new NotFoundException('Reserva no encontrada');
    return res[0];
  }

  async update(id: string, dto: UpdateReservationDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(reservaciones)
      .set({
        ...dto,
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
          ne(reservaciones.estatus, 'completada')
        )
      );
    const occupiedIds = new Set(occupied.map(r => r.mesaId));

    return allTables.map(t => ({
      ...t,
      estado: occupiedIds.has(t.id) ? 'ocupada' : 'disponible',
    }));
  }
}
