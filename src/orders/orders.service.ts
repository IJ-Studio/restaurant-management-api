import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../src/database/drizzle/constants';
import type { DrizzleDB } from '../../src/database/drizzle/drizzle.provider';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { CreateOrderMesaDto } from './dto/create-order-mesa.dto';
import {
  ordenes,
  ordenItems,
  platillos,
  clientes,
  mesas,
  direccionesCliente,
} from '../../src/database/schema/public.schema';

import { users } from '../../src/database/schema/public.schema';






@Injectable()
export class OrdersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async resolverClienteId(usuarioId: number): Promise<string> {
    const [clienteExistente] = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.userId, usuarioId))
      .limit(1);

    if (clienteExistente) return clienteExistente.id;

    const [nuevoCliente] = await this.db
      .insert(clientes)
      .values({ userId: usuarioId })
      .returning();

    return nuevoCliente.id;
  }

  private async resolverMesaId(numero: string): Promise<number> {
    const numeroNormalizado = numero.trim();

    const [mesa] = await this.db
      .select()
      .from(mesas)
      .where(sql`trim(lower(${mesas.numero})) = trim(lower(${numeroNormalizado}))`)
      .limit(1);

    if (!mesa) {
      throw new NotFoundException(
        `La mesa número "${numero}" no está registrada en la tabla "mesas". Verifica que exista una fila con ese numero.`,
      );
    }
    if (!mesa.activa) {
      throw new BadRequestException(`La mesa número ${numero} no está disponible actualmente.`);
    }
    return mesa.id;
  }

  // FIX (nuevo): helper compartido por agregarACarritoDomicilio,
  // agregarACarritoMesa y eliminarItemOrden. Antes cada uno repetía la
  // misma lógica de sumar subtotales y actualizar la orden.
  private async recalcularTotalOrden(ordenId: string): Promise<string> {
    const itemsDeLaOrden = await this.db
      .select()
      .from(ordenItems)
      .where(eq(ordenItems.ordenId, ordenId));

    const nuevoTotal = itemsDeLaOrden.reduce(
      (acc, it) => acc + parseFloat(it.subtotal ?? '0'),
      0,
    );

    await this.db
      .update(ordenes)
      .set({ subtotal: nuevoTotal.toString(), total: nuevoTotal.toString() })
      .where(eq(ordenes.id, ordenId));

    return nuevoTotal.toString();
  }

  async createOrderMesa(dto: CreateOrderMesaDto) {
    const listaItems = dto.items?.length
      ? dto.items
      : dto.platilloId
        ? [{ platilloId: dto.platilloId, cantidad: dto.cantidad ?? 1 }]
        : [];

    if (!listaItems.length) {
      throw new BadRequestException('Debes especificar al menos un platillo.');
    }

    const platillosIds = listaItems.map((i) => i.platilloId);
    const dbPlatillos = await this.db
      .select()
      .from(platillos)
      .where(inArray(platillos.id, platillosIds));

    if (!dbPlatillos.length) {
      throw new NotFoundException('No se encontraron los platillos especificados.');
    }
    const platillosMap = new Map(dbPlatillos.map((p) => [p.id, p]));

    const clienteId = await this.resolverClienteId(dto.usuarioId);
    const esDomicilio = !dto.mesa;

    try {
      if (esDomicilio) {
        return await this.agregarACarritoDomicilio(clienteId, listaItems, platillosMap);
      }

      const mesaDbId = await this.resolverMesaId(dto.mesa!);
      return await this.agregarACarritoMesa(clienteId, mesaDbId, dto.mesa!, listaItems, platillosMap);
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error real de Postgres (createOrderMesa):', error.cause ?? error);
      throw new BadRequestException(
        `Error interno al procesar el pedido: ${error.cause?.message || error.message}`,
      );
    }
  }

  // FIX (reescrito): ya NO se crea una orden nueva por cada producto
  // agregado. Ahora se busca (o crea) la orden 'pendiente' de esa mesa +
  // cliente, igual que ya hacía agregarACarritoDomicilio, y se acumulan
  // los productos ahí. La orden solo se manda a cocina cuando el cliente
  // presiona "Confirmar" (ver confirmarOrdenMesa).
  private async agregarACarritoMesa(
    clienteId: string,
    mesaDbId: number,
    mesaNumero: string,
    listaItems: { platilloId: number; cantidad: number }[],
    platillosMap: Map<number, any>,
  ) {
    const [ordenExistente] = await this.db
      .select()
      .from(ordenes)
      .where(
        and(
          eq(ordenes.clienteId, clienteId),
          eq(ordenes.mesaId, mesaDbId),
          eq(ordenes.tipo, 'mesa'),
          eq(ordenes.estatus, 'pendiente'),
        ),
      )
      .limit(1);

    let ordenId: string;
    if (ordenExistente) {
      ordenId = ordenExistente.id;
    } else {
      const [nuevaOrden] = await this.db
        .insert(ordenes)
        .values({
          tipo: 'mesa',
          mesaId: mesaDbId,
          clienteId,
          estatus: 'pendiente',
          subtotal: '0',
          total: '0',
          numComensales: 1,
        })
        .returning();
      ordenId = nuevaOrden.id;
    }

    for (const item of listaItems) {
      const platilloInfo = platillosMap.get(item.platilloId);
      if (!platilloInfo) {
        throw new NotFoundException(`El platillo con ID ${item.platilloId} no existe.`);
      }
      const precioUnitario = parseFloat(platilloInfo.precio.toString());

      const [itemExistente] = await this.db
        .select()
        .from(ordenItems)
        .where(and(eq(ordenItems.ordenId, ordenId), eq(ordenItems.platilloId, item.platilloId)))
        .limit(1);

      if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + item.cantidad;
        await this.db
          .update(ordenItems)
          .set({
            cantidad: nuevaCantidad,
            subtotal: (nuevaCantidad * precioUnitario).toString(),
          })
          .where(eq(ordenItems.id, itemExistente.id));
      } else {
        await this.db.insert(ordenItems).values({
          ordenId,
          platilloId: item.platilloId,
          cantidad: item.cantidad,
          precioUnitario: precioUnitario.toString(),
          subtotal: (item.cantidad * precioUnitario).toString(),
        });
      }
    }

    const totalActualizado = await this.recalcularTotalOrden(ordenId);

    return {
      success: true,
      message: 'Producto agregado a tu pedido de mesa.',
      ordenId,
      mesaId: mesaNumero,
      total: totalActualizado,
    };
  }

  private async agregarACarritoDomicilio(
    clienteId: string,
    listaItems: { platilloId: number; cantidad: number }[],
    platillosMap: Map<number, any>,
  ) {
    const [ordenExistente] = await this.db
      .select()
      .from(ordenes)
      .where(
        and(
          eq(ordenes.clienteId, clienteId),
          eq(ordenes.tipo, 'domicilio'),
          eq(ordenes.estatus, 'pendiente'),
        ),
      )
      .limit(1);

    let ordenId: string;
    if (ordenExistente) {
      ordenId = ordenExistente.id;
    } else {
      const [nuevaOrden] = await this.db
        .insert(ordenes)
        .values({
          tipo: 'domicilio',
          mesaId: null,
          clienteId,
          estatus: 'pendiente',
          subtotal: '0',
          total: '0',
        })
        .returning();
      ordenId = nuevaOrden.id;
    }

    for (const item of listaItems) {
      const platilloInfo = platillosMap.get(item.platilloId);
      if (!platilloInfo) {
        throw new NotFoundException(`El platillo con ID ${item.platilloId} no existe.`);
      }
      const precioUnitario = parseFloat(platilloInfo.precio.toString());

      const [itemExistente] = await this.db
        .select()
        .from(ordenItems)
        .where(and(eq(ordenItems.ordenId, ordenId), eq(ordenItems.platilloId, item.platilloId)))
        .limit(1);

      if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + item.cantidad;
        await this.db
          .update(ordenItems)
          .set({
            cantidad: nuevaCantidad,
            subtotal: (nuevaCantidad * precioUnitario).toString(),
          })
          .where(eq(ordenItems.id, itemExistente.id));
      } else {
        await this.db.insert(ordenItems).values({
          ordenId,
          platilloId: item.platilloId,
          cantidad: item.cantidad,
          precioUnitario: precioUnitario.toString(),
          subtotal: (item.cantidad * precioUnitario).toString(),
        });
      }
    }

    const totalActualizado = await this.recalcularTotalOrden(ordenId);

    return {
      success: true,
      message: 'Producto agregado a tu pedido a domicilio.',
      ordenId,
      mesaId: null,
      total: totalActualizado,
    };
  }

  // FIX (nuevo): manda a cocina la orden de mesa que estaba en 'pendiente'.
  // A partir de aquí ya no se pueden quitar productos (ver
  // eliminarItemOrden) y arranca la ventana de 2 minutos para cancelar
  // (esCancelable en el frontend usa tiempoApertura).
  async confirmarOrdenMesa(ordenId: string) {
    const [orden] = await this.db
      .select()
      .from(ordenes)
      .where(eq(ordenes.id, ordenId))
      .limit(1);

    if (!orden) {
      throw new NotFoundException(`La orden con ID ${ordenId} no existe.`);
    }
    if (orden.tipo !== 'mesa') {
      throw new BadRequestException('Esta orden no corresponde a un pedido de mesa.');
    }
    if (orden.estatus !== 'pendiente') {
      throw new BadRequestException(
        `Este pedido ya fue confirmado o no está disponible (estatus actual: ${orden.estatus}).`,
      );
    }

    const itemsDeLaOrden = await this.db
      .select()
      .from(ordenItems)
      .where(eq(ordenItems.ordenId, ordenId));

    if (!itemsDeLaOrden.length) {
      throw new BadRequestException('No puedes confirmar un pedido sin productos.');
    }

    await this.db
      .update(ordenes)
      .set({ estatus: 'abierta', tiempoApertura: new Date().toISOString() })
      .where(eq(ordenes.id, ordenId));

    return {
      success: true,
      message: 'Tu pedido fue enviado a cocina.',
      ordenId,
    };
  }

  // FIX (nuevo): quita un producto individual de un pedido, mesa o
  // domicilio, siempre y cuando ese pedido siga en 'pendiente' (carrito).
  // Una vez confirmado/enviado, esta ruta se bloquea a propósito.
  async eliminarItemOrden(itemId: number) {
    const [item] = await this.db
      .select()
      .from(ordenItems)
      .where(eq(ordenItems.id, itemId))
      .limit(1);

    if (!item) {
      throw new NotFoundException(`El producto con ID ${itemId} no existe en ningún pedido.`);
    }

    const [orden] = await this.db
      .select()
      .from(ordenes)
      .where(eq(ordenes.id, item.ordenId))
      .limit(1);

    if (!orden) {
      throw new NotFoundException('El pedido al que pertenece este producto ya no existe.');
    }

    if (orden.estatus !== 'pendiente') {
      throw new BadRequestException(
        'Este producto ya no se puede quitar porque el pedido ya fue confirmado.',
      );
    }

    await this.db.delete(ordenItems).where(eq(ordenItems.id, itemId));

    const totalActualizado = await this.recalcularTotalOrden(item.ordenId);

    const itemsRestantes = await this.db
      .select()
      .from(ordenItems)
      .where(eq(ordenItems.ordenId, item.ordenId));

    return {
      success: true,
      message: 'Producto eliminado de tu pedido.',
      ordenId: item.ordenId,
      total: totalActualizado,
      itemsRestantes: itemsRestantes.length,
    };
  }

  async findOrdersByUser(mesaNumero: string, usuarioId?: number) {
    let mesaDbId: number;
    try {
      mesaDbId = await this.resolverMesaId(mesaNumero);
    } catch {
      return [];
    }

    // FIX (nuevo): antes esta consulta solo filtraba por mesaId, así que
    // cualquiera que supiera el número de mesa (o lo tuviera guardado en
    // localStorage) veía el carrito de cualquier otro cliente en esa
    // mesa, incluso después de cerrar sesión. Ahora, si viene usuarioId,
    // se filtra también por el cliente real de la sesión.
    let clienteId: string | undefined;
    if (usuarioId) {
      const [cliente] = await this.db
        .select()
        .from(clientes)
        .where(eq(clientes.userId, usuarioId))
        .limit(1);

      // Si el usuario nunca ha hecho un pedido, todavía no tiene fila en
      // "clientes" y por lo tanto no puede tener órdenes.
      if (!cliente) return [];
      clienteId = cliente.id;
    }

    try {
      const condiciones = clienteId
        ? and(eq(ordenes.mesaId, mesaDbId), eq(ordenes.clienteId, clienteId))
        : eq(ordenes.mesaId, mesaDbId);

      const rows = await this.db
        .select({
          id: ordenes.id,
          mesaId: ordenes.mesaId,
          estatus: ordenes.estatus,
          total: ordenes.total,
          tiempoApertura: ordenes.tiempoApertura,
          itemId: ordenItems.id,
          cantidad: ordenItems.cantidad,
          precioUnitario: ordenItems.precioUnitario,
          platilloNombre: platillos.nombre,
          platilloImagen: platillos.imagenUrl,
        })
        .from(ordenes)
        .leftJoin(ordenItems, eq(ordenes.id, ordenItems.ordenId))
        .leftJoin(platillos, eq(ordenItems.platilloId, platillos.id))
        .where(condiciones)
        .orderBy(desc(ordenes.tiempoApertura));

      const groupedOrders: Record<string, any> = {};

      for (const row of rows) {
        if (!groupedOrders[row.id]) {
          groupedOrders[row.id] = {
            id: row.id,
            mesaId: mesaNumero,
            estatus: row.estatus,
            total: row.total,
            tiempoApertura: row.tiempoApertura,
            ordenItems: [],
          };
        }

        if (row.itemId) {
          groupedOrders[row.id].ordenItems.push({
            id: row.itemId,
            cantidad: row.cantidad,
            precioUnitario: row.precioUnitario,
            platillo: {
              nombre: row.platilloNombre,
              imagenUrl: row.platilloImagen,
            },
          });
        }
      }

      return Object.values(groupedOrders);
    } catch (error: any) {
      console.error('Error real de Postgres (findOrdersByUser):', error.cause ?? error);
      throw new BadRequestException(
        `Error al consultar las comandas de la mesa: ${error.cause?.message || error.message}`,
      );
    }
  }

  async findDeliveryOrdersByUser(usuarioId: number) {
    const [cliente] = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.userId, usuarioId))
      .limit(1);

    if (!cliente) return [];

    try {
      const rows = await this.db
        .select({
          id: ordenes.id,
          estatus: ordenes.estatus,
          total: ordenes.total,
          tiempoApertura: ordenes.tiempoApertura,
          tipo: ordenes.tipo,
          itemId: ordenItems.id,
          cantidad: ordenItems.cantidad,
          precioUnitario: ordenItems.precioUnitario,
          platilloNombre: platillos.nombre,
          platilloImagen: platillos.imagenUrl,
        })
        .from(ordenes)
        .leftJoin(ordenItems, eq(ordenes.id, ordenItems.ordenId))
        .leftJoin(platillos, eq(ordenItems.platilloId, platillos.id))
        .where(and(eq(ordenes.clienteId, cliente.id), eq(ordenes.tipo, 'domicilio')))
        .orderBy(desc(ordenes.tiempoApertura));

      // NOTA: la dirección de entrega se pide hasta el checkout, no aquí.
      const groupedOrders: Record<string, any> = {};

      for (const row of rows) {
        if (!groupedOrders[row.id]) {
          groupedOrders[row.id] = {
            id: row.id,
            estatus: row.estatus,
            total: row.total,
            creadoEn: row.tiempoApertura,
            items: [],
          };
        }

        if (row.itemId) {
          groupedOrders[row.id].items.push({
            id: row.itemId,
            cantidad: row.cantidad,
            precio: row.precioUnitario,
            nombre: row.platilloNombre,
          });
        }
      }

      return Object.values(groupedOrders);
    } catch (error: any) {
      console.error('Error real de Postgres (findDeliveryOrdersByUser):', error.cause ?? error);
      throw new BadRequestException(
        `Error al consultar pedidos a domicilio: ${error.cause?.message || error.message}`,
      );
    }
  }

  async cancelarOrden(ordenId: string) {
    const [orden] = await this.db
      .select()
      .from(ordenes)
      .where(eq(ordenes.id, ordenId))
      .limit(1);

    if (!orden) {
      throw new NotFoundException(`La orden con ID ${ordenId} no existe.`);
    }

    if (orden.estatus !== 'abierta') {
      throw new BadRequestException(`No se puede cancelar una comanda en estado: ${orden.estatus}.`);
    }

    if (!orden.tiempoApertura) {
      throw new BadRequestException('No se pudo determinar el tiempo de apertura de la comanda.');
    }

    const tiempoApertura = new Date(orden.tiempoApertura);
    const ahora = new Date();
    const diferenciaMs = ahora.getTime() - tiempoApertura.getTime();

    if (diferenciaMs > 2 * 60 * 1000) {
      throw new BadRequestException('El tiempo límite de 2 minutos para revocar el pedido ha expirado.');
    }

    await this.db.update(ordenes).set({ estatus: 'cancelada' }).where(eq(ordenes.id, ordenId));

    return {
      success: true,
      message: 'Tu comanda ha sido cancelada con éxito.',
    };
  }
    // NUEVO: Obtener órdenes recientes para administración
// Dentro de la clase OrdersService
async getRecentOrdersForAdmin(): Promise<any[]> {
  try {
    // Fechas límite del día de hoy
    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();

    const rows = await this.db
      .select({
        id: ordenes.id,
        customer: sql<string>`CONCAT(${users.name}, ' ', ${users.lastname})`.as('customer'),
        time: ordenes.tiempoApertura,
        item: platillos.nombre,
        table: mesas.numero,
        tipo: ordenes.tipo,
        status: ordenes.estatus,
        total: ordenes.total,
      })
      .from(ordenes)
      .leftJoin(clientes, eq(ordenes.clienteId, clientes.id))
      .leftJoin(users, eq(clientes.userId, users.id))
      .leftJoin(mesas, eq(ordenes.mesaId, mesas.id))
      .leftJoin(ordenItems, eq(ordenes.id, ordenItems.ordenId))
      .leftJoin(platillos, eq(ordenItems.platilloId, platillos.id))
      .where(
        and(
          sql`${ordenes.estatus} NOT IN ('cancelada', 'completada', 'entregada')`,
          sql`${ordenes.tiempoApertura} >= ${inicioDia}`,
          sql`${ordenes.tiempoApertura} < ${finDia}`,
        ),
      )
      .orderBy(desc(ordenes.tiempoApertura))
      .limit(50);

    // Agrupar para no repetir órdenes por cada item
    const orderMap = new Map<string, any>();
    for (const row of rows) {
      if (!orderMap.has(row.id)) {
        orderMap.set(row.id, {
          id: row.id,
          customer: row.customer || 'Sin cliente',
          time: row.time
            ? new Date(row.time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
            : '—',
          item: row.item || '—',
          table: row.table
            ? `Mesa ${row.table}`
            : row.tipo === 'domicilio' ? 'Domicilio' : 'N/A',
          status: row.status,
          total: Number(row.total ?? 0),
        });
      }
    }

    return Array.from(orderMap.values());
  } catch (error: any) {
    console.error('Error al obtener órdenes recientes:', error);
    throw new BadRequestException('Error al cargar las órdenes para administración.');
  }
}
}
