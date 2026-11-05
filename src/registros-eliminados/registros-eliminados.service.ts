import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { registrosEliminados } from '../database/schema/registros-eliminados.schema';
import { TABLAS_ARCHIVABLES, type TablaArchivable } from './archivar';

const POR_PAGINA = 50;

@Injectable()
export class RegistrosEliminadosService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listar(tabla: TablaArchivable | undefined, pagina: number) {
    const filas = await this.db
      .select()
      .from(registrosEliminados)
      .where(tabla ? eq(registrosEliminados.tablaOrigen, tabla) : undefined)
      .orderBy(desc(registrosEliminados.eliminadoEn))
      .limit(POR_PAGINA + 1)
      .offset((pagina - 1) * POR_PAGINA);
    return {
      registros: filas.slice(0, POR_PAGINA),
      pagina,
      haySiguiente: filas.length > POR_PAGINA,
    };
  }

  /** Vuelve a insertar la fila tal como se archivó. 409 si ya se restauró o si su id está ocupado. */
  async restaurar(id: number, autorId: number) {
    return this.db.transaction(async (tx) => {
      const [registro] = await tx
        .select()
        .from(registrosEliminados)
        .where(eq(registrosEliminados.id, id))
        .for('update');
      if (!registro) throw new NotFoundException('El registro no existe.');
      if (registro.restauradoEn)
        throw new ConflictException('Ese registro ya se restauró.');
      if (!TABLAS_ARCHIVABLES.includes(registro.tablaOrigen as TablaArchivable))
        throw new ConflictException('Ese registro no se puede restaurar.');
      const tabla = sql.identifier(registro.tablaOrigen);
      try {
        await tx.execute(sql`
          insert into ${tabla}
          select * from jsonb_populate_record(null::${tabla}, ${JSON.stringify(registro.datos)}::jsonb)
        `);
      } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        if (code === '23505')
          throw new ConflictException(
            'Ya existe una fila con ese identificador.',
          );
        if (code === '23503')
          throw new ConflictException(
            'Falta un registro relacionado: restaura antes ese.',
          );
        throw error;
      }
      await tx
        .update(registrosEliminados)
        .set({ restauradoEn: sql`now()`, restauradoPor: autorId })
        .where(
          and(
            eq(registrosEliminados.id, id),
            isNull(registrosEliminados.restauradoEn),
          ),
        );
      return { success: true as const };
    });
  }
}
