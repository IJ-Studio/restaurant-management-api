import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { promociones } from '../database/schema/public.schema';
import {
  archivarYBorrar,
  type DatosBaja,
} from '../registros-eliminados/archivar';
import type { ActualizarPromocionDto } from './promociones.dto';

type Promocion = typeof promociones.$inferSelect;

/** Fila en snake_case, como la espera la web (`PromotionRow`). */
export function aFila(p: Promocion) {
  return {
    id: p.id,
    titulo: p.titulo,
    descripcion: p.descripcion,
    badge: p.badge,
    emoji: p.emoji,
    color: p.color,
    precio_original:
      p.precioOriginal === null ? null : Number(p.precioOriginal),
    precio_descuento:
      p.precioDescuento === null ? null : Number(p.precioDescuento),
    imagen_url: p.imagenUrl,
    imagen_public_id: p.imagenPublicId,
    activa: p.activa,
    orden: p.orden,
    fecha_inicio: p.fechaInicio,
    fecha_fin: p.fechaFin,
  };
}

const precio = (v: number | null | undefined) =>
  v === undefined ? undefined : v === null ? null : v.toFixed(2);

/** Del cuerpo (snake_case) a columnas de Drizzle; solo lo que llegó. */
function columnas(dto: ActualizarPromocionDto) {
  const c: Partial<typeof promociones.$inferInsert> = {
    titulo: dto.titulo,
    descripcion: dto.descripcion,
    badge: dto.badge,
    color: dto.color,
    precioOriginal: precio(dto.precio_original),
    precioDescuento: precio(dto.precio_descuento),
    imagenUrl: dto.imagen_url,
    imagenPublicId: dto.imagen_public_id,
    activa: dto.activa,
    orden: dto.orden,
    fechaInicio: dto.fecha_inicio,
    fechaFin: dto.fecha_fin,
  };
  return Object.fromEntries(
    Object.entries(c).filter(([, v]) => v !== undefined),
  ) as Partial<typeof promociones.$inferInsert>;
}

function validarFechas(inicio?: string | null, fin?: string | null) {
  if (inicio && fin && inicio > fin)
    throw new BadRequestException(
      'La fecha de inicio no puede ser posterior a la de fin.',
    );
}

@Injectable()
export class PromocionesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Público: activas y dentro de sus fechas (hora de México), en el orden del admin. */
  async vigentes() {
    const hoy = sql`(now() at time zone 'America/Mexico_City')::date`;
    const filas = await this.db
      .select()
      .from(promociones)
      .where(
        and(
          eq(promociones.activa, true),
          or(
            isNull(promociones.fechaInicio),
            lte(promociones.fechaInicio, hoy),
          ),
          or(isNull(promociones.fechaFin), gte(promociones.fechaFin, hoy)),
        ),
      )
      .orderBy(asc(promociones.orden), asc(promociones.id));
    return filas.map(aFila);
  }

  async todas() {
    const filas = await this.db
      .select()
      .from(promociones)
      .orderBy(asc(promociones.orden), asc(promociones.id));
    return filas.map(aFila);
  }

  async crear(dto: ActualizarPromocionDto) {
    validarFechas(dto.fecha_inicio, dto.fecha_fin);
    const [fila] = await this.db
      .insert(promociones)
      .values(columnas(dto) as typeof promociones.$inferInsert)
      .returning();
    return aFila(fila);
  }

  async actualizar(id: number, dto: ActualizarPromocionDto) {
    const cambios = columnas(dto);
    if (Object.keys(cambios).length === 0)
      throw new BadRequestException('No hay cambios que guardar.');
    const [actual] = await this.db
      .select()
      .from(promociones)
      .where(eq(promociones.id, id));
    if (!actual) throw new NotFoundException('La promoción no existe.');
    validarFechas(
      dto.fecha_inicio !== undefined ? dto.fecha_inicio : actual.fechaInicio,
      dto.fecha_fin !== undefined ? dto.fecha_fin : actual.fechaFin,
    );
    const [fila] = await this.db
      .update(promociones)
      .set({ ...cambios, actualizadoEn: sql`now()` })
      .where(eq(promociones.id, id))
      .returning();
    return aFila(fila);
  }

  async eliminar(id: number, baja: DatosBaja) {
    if ((await archivarYBorrar(this.db, 'promociones', id, baja)) === 0)
      throw new NotFoundException('La promoción no existe.');
    return { success: true as const };
  }
}
