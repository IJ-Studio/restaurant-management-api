import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, desc, eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  inventarioMermas,
  inventarioOrdenes,
  inventarioProductos,
  inventarioProveedorProducto,
  inventarioProveedores,
} from '../database/schema/public.schema';
import {
  archivarYBorrar,
  type DatosBaja,
  type TablaArchivable,
} from '../registros-eliminados/archivar';
import type {
  ArticuloOrdenDto,
  OrdenCompraDto,
  ProductoDto,
  ProveedorDto,
} from './inventario.dto';

/** Quita lo que no llegó; los importes y cantidades pasan a texto para las columnas numeric. */
function definidos<T extends object>(o: T) {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
const decimal = (v?: number) => (v === undefined ? undefined : String(v));

function columnasProducto(dto: ProductoDto) {
  return definidos({
    name: dto.name,
    sku: dto.sku === null ? '' : dto.sku,
    category: dto.category,
    unit: dto.unit,
    stock: decimal(dto.stock),
    minStock: decimal(dto.minStock),
    maxStock: decimal(dto.maxStock),
    costPerUnit: decimal(dto.costPerUnit),
    supplier: dto.supplier === null ? '' : dto.supplier,
    active: dto.active,
  });
}

/** Total en centavos para no acumular errores de coma flotante. */
const totalDe = (items: ArticuloOrdenDto[]) =>
  (
    items.reduce((s, i) => s + Math.round(i.quantity * i.unitCost * 100), 0) /
    100
  ).toFixed(2);

@Injectable()
export class InventarioService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ── Productos ───────────────────────────────────────────────────────────────

  productos() {
    return this.db
      .select()
      .from(inventarioProductos)
      .orderBy(asc(inventarioProductos.name));
  }

  async crearProducto(dto: ProductoDto) {
    if (!dto.name || !dto.category)
      throw new BadRequestException('Escribe el nombre y la categoría.');
    const [fila] = await this.db
      .insert(inventarioProductos)
      .values({
        ...columnasProducto(dto),
        name: dto.name,
        category: dto.category,
      })
      .returning();
    return fila;
  }

  async actualizarProducto(id: number, dto: ProductoDto) {
    const cambios = columnasProducto(dto);
    if (Object.keys(cambios).length === 0)
      throw new BadRequestException('No hay cambios que guardar.');
    const [fila] = await this.db
      .update(inventarioProductos)
      .set({ ...cambios, lastUpdated: sql`now()` })
      .where(eq(inventarioProductos.id, id))
      .returning();
    if (!fila) throw new NotFoundException('El producto no existe.');
    return fila;
  }

  /** Fija las existencias contadas (inventario físico). */
  async ajustarExistencias(id: number, stock: number) {
    return this.actualizarProducto(id, { stock });
  }

  // ── Proveedores ─────────────────────────────────────────────────────────────

  proveedores() {
    return this.db
      .select()
      .from(inventarioProveedores)
      .orderBy(asc(inventarioProveedores.name));
  }

  async crearProveedor(dto: ProveedorDto) {
    if (!dto.name) throw new BadRequestException('Escribe el nombre.');
    const [fila] = await this.db
      .insert(inventarioProveedores)
      .values({
        ...definidos(dto),
        name: dto.name,
      } as typeof inventarioProveedores.$inferInsert)
      .returning();
    return fila;
  }

  async actualizarProveedor(id: number, dto: ProveedorDto) {
    const cambios = definidos(dto);
    if (Object.keys(cambios).length === 0)
      throw new BadRequestException('No hay cambios que guardar.');
    const [fila] = await this.db
      .update(inventarioProveedores)
      .set(cambios as Partial<typeof inventarioProveedores.$inferInsert>)
      .where(eq(inventarioProveedores.id, id))
      .returning();
    if (!fila) throw new NotFoundException('El proveedor no existe.');
    return fila;
  }

  // ── Órdenes de compra ───────────────────────────────────────────────────────

  ordenes() {
    return this.db
      .select()
      .from(inventarioOrdenes)
      .orderBy(desc(inventarioOrdenes.createdAt));
  }

  private async nombreProveedor(supplierId?: number | null) {
    if (!supplierId) return '';
    const [p] = await this.db
      .select({ name: inventarioProveedores.name })
      .from(inventarioProveedores)
      .where(eq(inventarioProveedores.id, supplierId));
    if (!p) throw new BadRequestException('El proveedor no existe.');
    return p.name;
  }

  async crearOrden(dto: OrdenCompraDto) {
    const items = dto.items ?? [];
    const supplierName = await this.nombreProveedor(dto.supplierId);
    // Folio legible a partir del id (OC-00042), en la misma transacción que el alta.
    return this.db.transaction(async (tx) => {
      const [nueva] = await tx
        .insert(inventarioOrdenes)
        .values({
          folio: 'OC-PENDIENTE',
          supplierId: dto.supplierId ?? null,
          supplierName,
          status: dto.status ?? 'borrador',
          items,
          total: totalDe(items),
          expectedAt: dto.expectedAt ?? null,
          notes: dto.notes ?? null,
        })
        .returning({ id: inventarioOrdenes.id });
      const [fila] = await tx
        .update(inventarioOrdenes)
        .set({
          folio: sql`'OC-' || lpad(${inventarioOrdenes.id}::text, 5, '0')`,
        })
        .where(eq(inventarioOrdenes.id, nueva.id))
        .returning();
      return fila;
    });
  }

  async actualizarOrden(id: number, dto: OrdenCompraDto) {
    const [actual] = await this.db
      .select()
      .from(inventarioOrdenes)
      .where(eq(inventarioOrdenes.id, id));
    if (!actual) throw new NotFoundException('La orden no existe.');
    if (actual.status === 'recibida')
      throw new ConflictException(
        'La orden ya se recibió: no se puede cambiar.',
      );
    const cambios: Partial<typeof inventarioOrdenes.$inferInsert> = definidos({
      status: dto.status,
      expectedAt: dto.expectedAt,
      notes: dto.notes,
    });
    if (dto.supplierId !== undefined) {
      cambios.supplierId = dto.supplierId;
      cambios.supplierName = await this.nombreProveedor(dto.supplierId);
    }
    if (dto.items) {
      cambios.items = dto.items;
      cambios.total = totalDe(dto.items);
    }
    if (dto.status === 'recibida')
      cambios.receivedAt = new Date().toISOString();
    if (Object.keys(cambios).length === 0)
      throw new BadRequestException('No hay cambios que guardar.');
    const [fila] = await this.db
      .update(inventarioOrdenes)
      .set(cambios)
      .where(eq(inventarioOrdenes.id, id))
      .returning();
    return fila;
  }

  // ── Mermas (historial completo para el admin) ───────────────────────────────

  mermas() {
    return this.db
      .select()
      .from(inventarioMermas)
      .orderBy(desc(inventarioMermas.createdAt))
      .limit(500);
  }

  // ── Bajas ───────────────────────────────────────────────────────────────────

  /** Archiva y borra; si otra tabla lo usa (mermas, órdenes), 409 con lo que conviene hacer. */
  async eliminar(tabla: TablaArchivable, id: number, baja: DatosBaja) {
    // Los vínculos proveedor-producto se borran en cascada y no se archivan: con vínculos, 409
    // (desactivarlo los conserva). Así una restauración no devuelve un registro a medias.
    if (
      tabla === 'inventario_productos' ||
      tabla === 'inventario_proveedores'
    ) {
      const columna =
        tabla === 'inventario_productos'
          ? inventarioProveedorProducto.productoId
          : inventarioProveedorProducto.proveedorId;
      const [vinculo] = await this.db
        .select({ id: inventarioProveedorProducto.id })
        .from(inventarioProveedorProducto)
        .where(eq(columna, id))
        .limit(1);
      if (vinculo)
        throw new ConflictException(
          'Está ligado a proveedores o productos: desactívalo en lugar de eliminarlo.',
        );
    }
    try {
      if ((await archivarYBorrar(this.db, tabla, id, baja)) === 0)
        throw new NotFoundException('El registro no existe.');
    } catch (error: unknown) {
      const e = error as { code?: string; cause?: { code?: string } };
      if (e?.code === '23503' || e?.cause?.code === '23503')
        throw new ConflictException(
          'Tiene historial (mermas u órdenes): desactívalo en lugar de eliminarlo.',
        );
      throw error;
    }
    return { success: true as const };
  }
}
