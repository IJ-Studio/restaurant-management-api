import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../src/database/drizzle/constants';
import type { DrizzleDB } from '../../src/database/drizzle/drizzle.provider';
import {
  ordenes,
  ordenItems,
  platillos,
  clientes,
  mesas,
  direccionesCliente,
} from '../../src/database/schema/public.schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { CreateOrderMesaDto } from './dto/create-order-mesa.dto';

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

      let totalGeneral = 0;
      const itemsAInsertar: any[] = [];

      for (const item of listaItems) {
        const platilloInfo = platillosMap.get(item.platilloId);
        if (!platilloInfo) {
          throw new NotFoundException(`El platillo con ID ${item.platilloId} no existe.`);
        }

        const precioUnitario = parseFloat(platilloInfo.precio.toString());
        const subtotalItem = precioUnitario * item.cantidad;
        totalGeneral += subtotalItem;

        itemsAInsertar.push({
          platilloId: item.platilloId,
          cantidad: item.cantidad,
          precioUnitario: precioUnitario.toString(),
          subtotal: subtotalItem.toString(),
        });
      }

      const [nuevaOrden] = await this.db
        .insert(ordenes)
        .values({
          tipo: 'mesa',
          mesaId: mesaDbId,
          clienteId,
          estatus: 'abierta',
          subtotal: totalGeneral.toString(),
          total: totalGeneral.toString(),
          descuentos: '0.00',
          impuestos: '0.00',
          propina: '0.00',
          numComensales: 1,
        })
        .returning();

      const itemsConOrdenId = itemsAInsertar.map((item) => ({
        ...item,
        ordenId: nuevaOrden.id,
      }));

      await this.db.insert(ordenItems).values(itemsConOrdenId);

      return {
        success: true,
        message: 'Pedido recibido exitosamente.',
        ordenId: nuevaOrden.id,
        mesaId: dto.mesa,
        total: nuevaOrden.total,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // 👇 Log del error real de Postgres (antes se perdía)
      console.error('Error real de Postgres (createOrderMesa):', error.cause ?? error);
      throw new BadRequestException(
        `Error interno al procesar el pedido: ${error.cause?.message || error.message}`,
      );
    }
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

    return {
      success: true,
      message: 'Producto agregado a tu pedido a domicilio.',
      ordenId,
      mesaId: null,
      total: nuevoTotal.toString(),
    };
  }

  async findOrdersByUser(mesaNumero: string) {
    let mesaDbId: number;
    try {
      mesaDbId = await this.resolverMesaId(mesaNumero);
    } catch {
      return [];
    }

    try {
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
        .where(eq(ordenes.mesaId, mesaDbId))
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
      // 👇 Log del error real de Postgres (antes se perdía)
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

    // NOTA: la dirección de entrega ya NO se resuelve aquí. Se pedirá en
    // el checkout (ver handleProcederAlPagoDomicilio en el frontend), así
    // que este listado solo muestra el pedido y su estatus, sin dirección
    // todavía. Cuando implementes el checkout, esa pantalla es la que debe
    // insertar/seleccionar la fila en "direcciones_cliente" (o el campo
    // que decidas usar) y ligarla a la orden antes de pagar.
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
}
