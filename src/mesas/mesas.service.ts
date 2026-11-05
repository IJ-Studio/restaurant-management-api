import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  areasSalon,
  estatusMesa,
  mesas,
  ordenes,
  reservaciones,
} from '../database/schema/public.schema';
import {
  archivarYBorrar,
  type DatosBaja,
} from '../registros-eliminados/archivar';
import type { MesaDto } from './mesa.dto';

/** Reservaciones que todavía van a ocurrir. */
const ESTATUS_RESERVA_ACTIVA = ['pendiente', 'confirmada'];

const definidos = <T extends object>(o: T) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;

const esDuplicado = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code === '23505' || x?.cause?.code === '23505';
};

@Injectable()
export class MesasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll() {
    try {
      return await this.db.select().from(mesas);
    } catch (error) {
      console.error('Error obteniendo la lista de mesas:', error);
      throw new InternalServerErrorException(
        'Error al consultar las mesas disponibles',
      );
    }
  }

  // ── Administración (Prioridad 1.3) ──────────────────────────────────────────

  /** Todas las mesas (también las inactivas) con su área, si tienen historial y sus reservas activas. */
  async listarAdmin(id?: number) {
    const ahora = new Date().toISOString();
    return await this.db
      .select({
        id: mesas.id,
        numero: mesas.numero,
        nombre: mesas.nombre,
        capacidad: mesas.capacidad,
        forma: mesas.forma,
        areaId: mesas.areaId,
        areaNombre: areasSalon.nombre,
        activa: mesas.activa,
        conHistorial: sql<boolean>`(exists (select 1 from ${ordenes} where ${ordenes.mesaId} = ${mesas.id})
          or exists (select 1 from ${reservaciones} where ${reservaciones.mesaId} = ${mesas.id}))`,
        reservasActivas: sql<number>`(select count(*)::int from ${reservaciones}
          where ${reservaciones.mesaId} = ${mesas.id}
          and ${reservaciones.fechaHora} >= ${ahora}
          and ${inArray(reservaciones.estatus, ESTATUS_RESERVA_ACTIVA)})`,
      })
      .from(mesas)
      .leftJoin(areasSalon, eq(mesas.areaId, areasSalon.id))
      .where(id === undefined ? undefined : eq(mesas.id, id))
      .orderBy(asc(mesas.numero));
  }

  areas() {
    return this.db
      .select({
        id: areasSalon.id,
        nombre: areasSalon.nombre,
        activa: areasSalon.activa,
      })
      .from(areasSalon)
      .orderBy(asc(areasSalon.nombre));
  }

  async crear(dto: MesaDto) {
    if (!dto.numero || !dto.capacidad)
      throw new BadRequestException(
        'Escribe el número y la capacidad de la mesa.',
      );
    return this.guardar(() =>
      this.db
        .insert(mesas)
        .values({
          ...definidos(dto),
          numero: dto.numero!,
          capacidad: dto.capacidad!,
        })
        .returning(),
    );
  }

  async actualizar(id: number, dto: MesaDto) {
    const cambios = definidos(dto);
    if (Object.keys(cambios).length === 0)
      throw new BadRequestException('No hay cambios que guardar.');
    const fila = await this.guardar(() =>
      this.db.update(mesas).set(cambios).where(eq(mesas.id, id)).returning(),
    );
    if (!fila) throw new NotFoundException('La mesa no existe.');
    return fila;
  }

  /**
   * Baja de una mesa. Si tiene historial (órdenes o reservaciones) o reservas activas no se borra:
   * se desactiva y se conserva todo. Si no, se archiva en `registros_eliminados` y se borra.
   */
  async eliminar(id: number, baja: DatosBaja) {
    const [mesa] = await this.listarAdmin(id);
    if (!mesa) throw new NotFoundException('La mesa no existe.');
    if (mesa.conHistorial || mesa.reservasActivas > 0) {
      await this.db
        .update(mesas)
        .set({ activa: false })
        .where(eq(mesas.id, id));
      return {
        resultado: 'desactivada' as const,
        reservasActivas: mesa.reservasActivas,
        message:
          mesa.reservasActivas > 0
            ? `La mesa tiene ${mesa.reservasActivas} reservación(es) por venir: se desactivó y se conservan.`
            : 'La mesa tiene historial: se desactivó en lugar de borrarla.',
      };
    }
    await this.db.transaction(async (tx) => {
      // El estado de la mesa (una fila por mesa, sin orden) no es historial: se va con ella.
      await tx
        .delete(estatusMesa)
        .where(
          and(eq(estatusMesa.mesaId, id), sql`${estatusMesa.ordenId} is null`),
        );
      await archivarYBorrar(tx, 'mesas', id, baja);
    });
    return {
      resultado: 'eliminada' as const,
      reservasActivas: 0,
      message: 'Mesa eliminada.',
    };
  }

  private async guardar(
    escribir: () => Promise<(typeof mesas.$inferSelect)[]>,
  ) {
    try {
      const [fila] = await escribir();
      return fila;
    } catch (error) {
      if (esDuplicado(error))
        throw new ConflictException('Ya hay una mesa con ese número.');
      throw error;
    }
  }
}
