import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../database/drizzle/constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema/public.schema';
import { eq, and, desc, SQL, sql } from 'drizzle-orm';
import { PlatilloEntity } from '../interfaces/platillo.interface';

@Injectable()
export class PlatillosRepository {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  // Mantiene tu lógica original para la landing pública
  async findPublicPlatillos(categoriaId?: number) {
    const conditions = [eq(schema.platillos.disponible, true)];
    if (categoriaId) {
      conditions.push(eq(schema.platillos.categoriaId, categoriaId));
    }

    return await this.db
      .select({
        id: schema.platillos.id,
        nombre: schema.platillos.nombre,
        descripcionCorta: schema.platillos.descripcionCorta,
        precio: schema.platillos.precio,
        imagenUrl: schema.platillos.imagenUrl,
        esPopular: schema.platillos.esPopular,
        esNuevo: schema.platillos.esNuevo,
        esDelChef: schema.platillos.esDelChef,
        tiempoPreparacion: schema.platillos.tiempoPreparacion,
        categoria: {
          id: schema.categoriasMenu.id,
          nombre: schema.categoriasMenu.nombre,
          icono: schema.categoriasMenu.icono,
          color: schema.categoriasMenu.color,
        },
      })
      .from(schema.platillos)
      .leftJoin(
        schema.categoriasMenu,
        eq(schema.platillos.categoriaId, schema.categoriasMenu.id),
      )
      .where(and(...conditions));
  }

  // NUEVO MÉTODO: Obtiene todo el registro del platillo y su categoría para el detalle de producto
  async findByIdWithCategory(id: number) {
    const result = await this.db
      .select({
        platillo: schema.platillos,
        categoria: {
          id: schema.categoriasMenu.id,
          nombre: schema.categoriasMenu.nombre,
        },
      })
      .from(schema.platillos)
      .leftJoin(
        schema.categoriasMenu,
        eq(schema.platillos.categoriaId, schema.categoriasMenu.id),
      )
      .where(eq(schema.platillos.id, id))
      .limit(1);

    return result[0] || null;
  }
}
