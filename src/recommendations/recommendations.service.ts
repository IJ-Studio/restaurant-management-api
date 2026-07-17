import { Injectable, Inject } from '@nestjs/common';
import { eq, notInArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE } from '../database/drizzle/constants';
import * as schema from '../database/schema/public.schema';

// Órdenes en estos estatus no representan una compra completada, así que
// no cuentan como "canasta" para las reglas de asociación.
const ESTATUS_EXCLUIDOS = ['cancelada', 'pendiente'];

const MIN_SOPORTE_ANCLA = 5; // el platillo base necesita aparecer en al menos N órdenes
const MIN_COOCURRENCIA = 3; // la pareja debe repetirse al menos N veces
const MIN_CONFIANZA = 0.3; // al menos 30% de las órdenes con el ancla incluyeron la pareja
const DESCUENTO_COMBO = 0.15; // 15% de descuento en el producto sugerido al llevarlo junto

interface RegistroItem {
  ordenId: string;
  platilloId: number;
}

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getComboSuggestion(platilloId: number) {
    const rows: RegistroItem[] = await this.db
      .select({
        ordenId: schema.ordenItems.ordenId,
        platilloId: schema.ordenItems.platilloId,
      })
      .from(schema.ordenItems)
      .innerJoin(
        schema.ordenes,
        eq(schema.ordenItems.ordenId, schema.ordenes.id),
      )
      .where(notInArray(schema.ordenes.estatus, ESTATUS_EXCLUIDOS));

    const canastas = new Map<string, Set<number>>();
    for (const row of rows) {
      if (!canastas.has(row.ordenId)) canastas.set(row.ordenId, new Set());
      canastas.get(row.ordenId)!.add(row.platilloId);
    }

    const totalCanastas = canastas.size;
    let soporteAncla = 0;
    const coocurrencia = new Map<number, number>();
    const soportePorPlatillo = new Map<number, number>();

    for (const items of canastas.values()) {
      for (const id of items) {
        soportePorPlatillo.set(id, (soportePorPlatillo.get(id) ?? 0) + 1);
      }
      if (!items.has(platilloId)) continue;
      soporteAncla++;
      for (const otroId of items) {
        if (otroId === platilloId) continue;
        coocurrencia.set(otroId, (coocurrencia.get(otroId) ?? 0) + 1);
      }
    }

    if (soporteAncla < MIN_SOPORTE_ANCLA) {
      return {
        disponible: false,
        motivo: 'No hay suficientes órdenes con este platillo todavía.',
      };
    }

    let mejor: {
      id: number;
      coOcurrencias: number;
      confianza: number;
      lift: number;
    } | null = null;

    for (const [id, coOcurrencias] of coocurrencia.entries()) {
      if (coOcurrencias < MIN_COOCURRENCIA) continue;
      const confianza = coOcurrencias / soporteAncla;
      if (confianza < MIN_CONFIANZA) continue;

      const soporteOtro = soportePorPlatillo.get(id) ?? 0;
      const lift = confianza / (soporteOtro / totalCanastas);
      if (lift <= 1) continue;

      if (!mejor || confianza > mejor.confianza) {
        mejor = { id, coOcurrencias, confianza, lift };
      }
    }

    if (!mejor) {
      return {
        disponible: false,
        motivo: 'Todavía no hay una combinación con suficiente confianza.',
      };
    }

    const [base] = await this.db
      .select()
      .from(schema.platillos)
      .where(eq(schema.platillos.id, platilloId));
    const [sugerido] = await this.db
      .select()
      .from(schema.platillos)
      .where(eq(schema.platillos.id, mejor.id));

    const precioSugerido = parseFloat(sugerido.precio);
    const precioCombo = Math.round(precioSugerido * (1 - DESCUENTO_COMBO));
    const ahorro = Math.round(precioSugerido - precioCombo);

    return {
      disponible: true,
      platilloBase: { id: base.id, nombre: base.nombre },
      sugerido: {
        id: sugerido.id,
        nombre: sugerido.nombre,
        imagenUrl: sugerido.imagenUrl,
        precio: precioSugerido,
      },
      soporte: {
        ordenesConBase: soporteAncla,
        ordenesConAmbos: mejor.coOcurrencias,
        totalOrdenes: totalCanastas,
      },
      confianza: Math.round(mejor.confianza * 100),
      lift: Math.round(mejor.lift * 100) / 100,
      precioCombo,
      ahorro,
    };
  }
}
