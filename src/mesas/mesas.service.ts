import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { DRIZZLE } from '../../src/database/drizzle/constants';
import type { DrizzleDB } from '../../src/database/drizzle/drizzle.provider';
import { mesas } from '../../src/database/schema/public.schema';

@Injectable()
export class MesasService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAll() {
    try {
      // Consulta limpia a la tabla "mesas" usando tu instancia inyectada de Drizzle
      const allMesas = await this.db.select().from(mesas);
      return allMesas;
    } catch (error) {
      console.error('Error obteniendo la lista de mesas:', error);
      throw new InternalServerErrorException('Error al consultar las mesas disponibles');
    }
  }
}
