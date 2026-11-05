import { sql } from 'drizzle-orm';

import type { DrizzleDB } from '../database/drizzle/drizzle.provider';

/** Tablas que el API puede dar de baja. Facturas, pagos y reembolsos no están: no se borran. */
export const TABLAS_ARCHIVABLES = [
  'platillos',
  'empleados',
  'puestos',
  'direcciones_cliente',
  'metodos_pago_guardados',
  'perfiles_facturacion',
  'promociones',
  'inventario_productos',
  'inventario_proveedores',
  'inventario_ordenes',
  'mesas',
] as const;
export type TablaArchivable = (typeof TABLAS_ARCHIVABLES)[number];

export interface DatosBaja {
  motivo?: string | null;
  autorId?: number | null;
}

/**
 * Borra la fila `id` de `tabla` y guarda una copia completa en `registros_eliminados`, en una
 * sola sentencia: si el borrado falla (p. ej. 23503 por una clave foránea) no se archiva nada.
 * Devuelve cuántas filas se dieron de baja (0 si no existía).
 */
export async function archivarYBorrar(
  db: Pick<DrizzleDB, 'execute'>,
  tabla: TablaArchivable,
  id: string | number,
  { motivo = null, autorId = null }: DatosBaja = {},
): Promise<number> {
  const filas = (await db.execute(sql`
    with borrado as (
      delete from ${sql.identifier(tabla)} where id = ${id} returning *
    )
    insert into registros_eliminados (tabla_origen, registro_id, datos, motivo, autor_id)
    select ${tabla}, ${String(id)}, to_jsonb(borrado), ${limpiarMotivo(motivo)}, ${autorId}
    from borrado
    returning id
  `)) as unknown as Array<{ id: number }>;
  return filas.length;
}

/** Motivo en mayúsculas, sin espacios de sobra y con el largo de la columna; vacío → null. */
export function limpiarMotivo(
  motivo: string | null | undefined,
): string | null {
  const limpio = (motivo ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  return limpio ? limpio.slice(0, 300) : null;
}
