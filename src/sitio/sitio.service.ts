import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { restaurante, systemSettings } from '../database/schema/public.schema';
import type { ImagenSitioDto, SitioDto } from './sitio.dto';

const CLAVE = 'sitio_imagenes';
type Imagenes = Pick<SitioDto, 'portada' | 'colorRespaldo'> & {
  login: ImagenSitioDto | null;
  registro: ImagenSitioDto | null;
};
/** Sin configurar: la web usa sus imágenes locales con este color de respaldo. */
const POR_DEFECTO: Imagenes = {
  portada: [],
  login: null,
  registro: null,
  colorRespaldo: '#2B2119',
};

export type Sitio = Imagenes & {
  telefono: string | null;
  whatsapp: string | null;
};

/** Imágenes de la landing, login y registro, y teléfono/WhatsApp del restaurante (P1.5). */
@Injectable()
export class SitioService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async obtener(): Promise<Sitio> {
    const [ajuste] = await this.db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, CLAVE))
      .limit(1);
    const [config] = await this.db
      .select({
        telefono: restaurante.telefono,
        whatsapp: restaurante.whatsapp,
      })
      .from(restaurante)
      .limit(1);
    return {
      ...POR_DEFECTO,
      ...((ajuste?.value ?? {}) as Partial<Imagenes>),
      telefono: config?.telefono ?? null,
      whatsapp: config?.whatsapp ?? null,
    };
  }

  async guardar(dto: SitioDto): Promise<Sitio> {
    const imagenes: Imagenes = {
      portada: dto.portada,
      login: dto.login ?? null,
      registro: dto.registro ?? null,
      colorRespaldo: dto.colorRespaldo,
    };
    await this.db.transaction(async (tx) => {
      await tx
        .insert(systemSettings)
        .values({ key: CLAVE, value: imagenes })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value: imagenes, updatedAt: sql`now()` },
        });
      const telefonos = {
        telefono: dto.telefono.trim(),
        whatsapp: dto.whatsapp?.trim() || null,
      };
      const actualizadas = await tx
        .update(restaurante)
        .set(telefonos)
        .returning({ id: restaurante.id });
      if (actualizadas.length === 0)
        await tx.insert(restaurante).values(telefonos);
    });
    return this.obtener();
  }
}
