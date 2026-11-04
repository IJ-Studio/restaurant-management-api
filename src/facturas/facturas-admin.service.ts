import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or, type SQL } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { facturas } from '../database/schema/public.schema';

export const POR_PAGINA = 50;

/** Listado de facturas para el administrador, paginado en el servidor. */
@Injectable()
export class FacturasAdminService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listar(filtro: {
    pagina: number;
    estatus?: string;
    busqueda?: string;
  }) {
    const condiciones: SQL[] = [];
    if (filtro.estatus) condiciones.push(eq(facturas.estatus, filtro.estatus));
    const q = filtro.busqueda?.trim();
    if (q) {
      // Los comodines que escriba la persona (\ % _) se buscan literales.
      const patron = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
      condiciones.push(
        or(
          ilike(facturas.rfcReceptor, patron),
          ilike(facturas.razonSocial, patron),
          ilike(facturas.folio, patron),
        ) as SQL,
      );
    }
    const filas = await this.db
      .select({
        id: facturas.id,
        ordenId: facturas.ordenId,
        serie: facturas.serie,
        folio: facturas.folio,
        folioFiscal: facturas.folioFiscal,
        rfcReceptor: facturas.rfcReceptor,
        razonSocial: facturas.razonSocial,
        usoCfdi: facturas.usoCfdi,
        subtotal: facturas.subtotal,
        iva: facturas.iva,
        total: facturas.total,
        estatus: facturas.estatus,
        fechaEmision: facturas.fechaEmision,
        fechaCancelacion: facturas.fechaCancelacion,
      })
      .from(facturas)
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(facturas.fechaEmision))
      .limit(POR_PAGINA + 1)
      .offset((filtro.pagina - 1) * POR_PAGINA);
    return {
      facturas: filas.slice(0, POR_PAGINA),
      pagina: filtro.pagina,
      haySiguiente: filas.length > POR_PAGINA,
    };
  }
}
