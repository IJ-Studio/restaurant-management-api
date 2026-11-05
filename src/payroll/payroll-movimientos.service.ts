import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { nominaMovimientos } from '../database/schema/nomina-movimientos.schema';
import { empleados, puestos, users } from '../database/schema/public.schema';
import type { CrearMovimientoNominaDto } from './dto/movimiento-nomina.dto';

export const POR_PAGINA = 50;

const centavos = (v: string | number | null | undefined) =>
  Math.round(Number(v ?? 0) * 100);
const pesos = (c: number) => (c / 100).toFixed(2);

/**
 * Sumas y restas a la nómina (Prioridad 3.1). Solo controla la nómina: no ejecuta pagos. El
 * historial no se edita ni se borra (lo impide la BD); una corrección es el movimiento inverso.
 */
@Injectable()
export class PayrollMovimientosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listar(filtro: {
    empleadoId?: string;
    desde?: string;
    hasta?: string;
    pagina: number;
  }) {
    const correccion = alias(nominaMovimientos, 'correccion');
    const condiciones: SQL[] = [];
    if (filtro.empleadoId)
      condiciones.push(eq(nominaMovimientos.empleadoId, filtro.empleadoId));
    if (filtro.desde)
      condiciones.push(gte(nominaMovimientos.periodoInicio, filtro.desde));
    if (filtro.hasta)
      condiciones.push(lte(nominaMovimientos.periodoFin, filtro.hasta));
    const filas = await this.db
      .select({
        id: nominaMovimientos.id,
        empleadoId: nominaMovimientos.empleadoId,
        empleado: empleados.nombre,
        tipo: nominaMovimientos.tipo,
        concepto: nominaMovimientos.concepto,
        monto: nominaMovimientos.monto,
        periodoInicio: nominaMovimientos.periodoInicio,
        periodoFin: nominaMovimientos.periodoFin,
        fecha: nominaMovimientos.fecha,
        justificacion: nominaMovimientos.justificacion,
        autorId: nominaMovimientos.autorId,
        autor: sql<string>`${users.name} || ' ' || ${users.lastname}`,
        corrigeId: nominaMovimientos.corrigeId,
        corregidoPor: correccion.id,
        creadoEn: nominaMovimientos.creadoEn,
      })
      .from(nominaMovimientos)
      .innerJoin(empleados, eq(empleados.id, nominaMovimientos.empleadoId))
      .innerJoin(users, eq(users.id, nominaMovimientos.autorId))
      .leftJoin(correccion, eq(correccion.corrigeId, nominaMovimientos.id))
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(nominaMovimientos.creadoEn), desc(nominaMovimientos.id))
      .limit(POR_PAGINA + 1)
      .offset((filtro.pagina - 1) * POR_PAGINA);
    return {
      movimientos: filas.slice(0, POR_PAGINA).map((f) => ({
        ...f,
        monto: Number(f.monto),
      })),
      pagina: filtro.pagina,
      haySiguiente: filas.length > POR_PAGINA,
    };
  }

  async crear(dto: CrearMovimientoNominaDto, autorId: number) {
    if (dto.periodoFin < dto.periodoInicio)
      throw new BadRequestException(
        'El fin del periodo no puede ser anterior al inicio.',
      );
    const [empleado] = await this.db
      .select({ id: empleados.id })
      .from(empleados)
      .where(eq(empleados.id, dto.empleadoId));
    if (!empleado)
      throw new NotFoundException('Esa persona no está en la nómina.');
    const [fila] = await this.db
      .insert(nominaMovimientos)
      .values({
        empleadoId: dto.empleadoId,
        tipo: dto.tipo,
        concepto: dto.concepto,
        monto: dto.monto.toFixed(2),
        periodoInicio: dto.periodoInicio,
        periodoFin: dto.periodoFin,
        ...(dto.fecha ? { fecha: dto.fecha } : {}),
        justificacion: dto.justificacion,
        autorId,
      })
      .returning();
    return { ...fila, monto: Number(fila.monto) };
  }

  /** Registra el movimiento inverso de `id`; nunca edita el original. */
  async corregir(id: number, justificacion: string, autorId: number) {
    const [original] = await this.db
      .select()
      .from(nominaMovimientos)
      .where(eq(nominaMovimientos.id, id));
    if (!original) throw new NotFoundException('El movimiento no existe.');
    if (original.corrigeId)
      throw new ConflictException(
        'Una corrección no se corrige: registra un movimiento nuevo.',
      );
    try {
      const [fila] = await this.db
        .insert(nominaMovimientos)
        .values({
          empleadoId: original.empleadoId,
          tipo: original.tipo === 'suma' ? 'resta' : 'suma',
          concepto: 'correccion',
          monto: original.monto,
          periodoInicio: original.periodoInicio,
          periodoFin: original.periodoFin,
          justificacion,
          autorId,
          corrigeId: original.id,
        })
        .returning();
      return { ...fila, monto: Number(fila.monto) };
    } catch (error: unknown) {
      const e = error as { code?: string; cause?: { code?: string } };
      if ((e?.code ?? e?.cause?.code) === '23505')
        throw new ConflictException('Ese movimiento ya se corrigió.');
      throw error;
    }
  }

  /**
   * Neto de cada persona en el periodo, con el cálculo completo («Ver cálculo»): sale de las mismas
   * filas que se suman, así que el desglose coincide exactamente con el resultado.
   */
  async resumen(periodoInicio: string, periodoFin: string) {
    const personas = await this.db
      .select({
        empleadoId: empleados.id,
        nombre: empleados.nombre,
        puesto: puestos.nombre,
        base: puestos.salarioBase,
      })
      .from(empleados)
      .leftJoin(puestos, eq(puestos.id, empleados.puestoId))
      .where(eq(empleados.activo, true))
      .orderBy(empleados.nombre);
    const movimientos = await this.db
      .select({
        id: nominaMovimientos.id,
        empleadoId: nominaMovimientos.empleadoId,
        tipo: nominaMovimientos.tipo,
        concepto: nominaMovimientos.concepto,
        monto: nominaMovimientos.monto,
      })
      .from(nominaMovimientos)
      .where(
        and(
          gte(nominaMovimientos.periodoInicio, periodoInicio),
          lte(nominaMovimientos.periodoFin, periodoFin),
        ),
      );
    return personas.map((p) => {
      const propios = movimientos.filter((m) => m.empleadoId === p.empleadoId);
      const base = centavos(p.base);
      const sumas = propios
        .filter((m) => m.tipo === 'suma')
        .reduce((s, m) => s + centavos(m.monto), 0);
      const restas = propios
        .filter((m) => m.tipo === 'resta')
        .reduce((s, m) => s + centavos(m.monto), 0);
      return {
        empleadoId: p.empleadoId,
        nombre: p.nombre,
        puesto: p.puesto,
        base: Number(pesos(base)),
        sumas: Number(pesos(sumas)),
        restas: Number(pesos(restas)),
        neto: Number(pesos(base + sumas - restas)),
        calculo: {
          formula: 'neto = base + sumas − restas',
          periodo: { inicio: periodoInicio, fin: periodoFin },
          datos: [
            {
              clave: 'base',
              valor: Number(pesos(base)),
              origen: 'puestos.salario_base',
            },
            ...propios.map((m) => ({
              clave: `${m.tipo}:${m.concepto}#${m.id}`,
              valor: (m.tipo === 'resta' ? -1 : 1) * Number(m.monto),
              origen: 'nomina_movimientos',
            })),
          ],
        },
      };
    });
  }
}
