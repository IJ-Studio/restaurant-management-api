import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { ROLES } from '../common/constants/roles';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  mesas,
  metodosPago,
  ordenes,
  ordenItems,
  pagos,
  platillos,
  users,
} from '../database/schema/public.schema';
import { NotificationsService } from '../notifications/notifications.service';
import type { ChargeOrderDto } from './dto/charge-order.dto';
import type { EstatusOperativo } from './dto/update-order-status.dto';
import type { OrderRequester } from './orders.service';

/** Estatus en los que un pedido ya está en el restaurante y se puede cobrar en caja. */
export const ESTATUS_COBRABLES = [
  'abierta',
  'en_preparacion',
  'lista',
  'entregada',
  'para_cobrar',
];

/**
 * Flujo de un pedido en el restaurante: abierta (enviado a cocina) → en_preparacion → lista →
 * entregada → pagada. Cocina mueve hasta "lista"; el piso lo entrega; caja lo cobra.
 * El administrador puede hacer cualquier paso.
 */
const TRANSICIONES: Record<
  EstatusOperativo,
  { desde: string[]; roles: number[] }
> = {
  en_preparacion: { desde: ['abierta'], roles: [ROLES.ADMIN, ROLES.COCINA] },
  lista: {
    desde: ['abierta', 'en_preparacion'],
    roles: [ROLES.ADMIN, ROLES.COCINA],
  },
  entregada: {
    desde: ['lista'],
    roles: [ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO],
  },
};

/**
 * Avisos push cuando el pedido cambia de manos (HU-07): cocina avisa al piso que ya está listo y
 * el piso avisa a caja que ya se entregó. El aviso solo lleva la mesa y el id del pedido: nunca
 * nombres de clientes ni importes, porque se ve con el teléfono bloqueado.
 */
export const AVISOS: Partial<
  Record<
    EstatusOperativo,
    {
      roles: number[];
      type: string;
      title: string;
      body: (lugar: string) => string;
    }
  >
> = {
  lista: {
    roles: [ROLES.MESERO],
    type: 'order_ready',
    title: 'Pedido listo',
    body: (lugar) => `${lugar}: listo para entregar.`,
  },
  entregada: {
    roles: [ROLES.CAJERO],
    type: 'order_delivered',
    title: 'Cuenta por cobrar',
    body: (lugar) => `${lugar}: entregado, falta cobrar.`,
  },
};

const MENSAJE: Record<EstatusOperativo, string> = {
  en_preparacion: 'Cocina empezó a preparar el pedido.',
  lista: 'El pedido está listo para entregarse.',
  entregada: 'Pedido entregado a la mesa.',
};

/** El cobro en línea es de Stripe (webhook); en caja solo se registran los demás métodos. */
const esPasarelaEnLinea = (nombre: string) =>
  /stripe|en l[ií]nea/i.test(nombre);
const esEfectivo = (metodo: { nombre: string; tipo: string | null }) =>
  /efectivo/i.test(metodo.tipo ?? '') || /efectivo/i.test(metodo.nombre);

const centavos = (monto: number) => Math.round(monto * 100);
const pesos = (cents: number) => (cents / 100).toFixed(2);

@Injectable()
export class OrderWorkflowService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly notifications: NotificationsService,
  ) {}

  /** Nunca lanza: un aviso que falla no debe deshacer ni retrasar el cambio de estado. */
  private async avisar(
    estatus: EstatusOperativo,
    orden: { id: string; mesaId: number | null },
  ): Promise<void> {
    const aviso = AVISOS[estatus];
    if (!aviso) return;
    try {
      const [mesa] = orden.mesaId
        ? await this.db
            .select({ numero: mesas.numero })
            .from(mesas)
            .where(eq(mesas.id, orden.mesaId))
            .limit(1)
        : [];
      // Sin mesa (para llevar o a domicilio) se usa el folio corto que ve el personal en pantalla.
      const lugar = mesa
        ? `Mesa ${mesa.numero}`
        : `Pedido ${orden.id.slice(0, 6).toUpperCase()}`;
      await this.notifications.sendToRoles(aviso.roles, {
        title: aviso.title,
        body: aviso.body(lugar),
        data: { type: aviso.type, orderId: orden.id },
      });
    } catch {
      // Sin aviso: el personal lo ve igual en su lista de pedidos.
    }
  }

  private async buscarOrden(ordenId: string) {
    const [orden] = await this.db
      .select()
      .from(ordenes)
      .where(eq(ordenes.id, ordenId))
      .limit(1);
    if (!orden) throw new NotFoundException('El pedido no existe.');
    return orden;
  }

  /** Pedido con su mesa y sus platillos (GET /pedidos/:id). */
  async obtenerDetalle(ordenId: string) {
    const orden = await this.buscarOrden(ordenId);

    const [mesa] = orden.mesaId
      ? await this.db
          .select({ numero: mesas.numero })
          .from(mesas)
          .where(eq(mesas.id, orden.mesaId))
          .limit(1)
      : [];

    const items = await this.db
      .select({
        id: ordenItems.id,
        cantidad: ordenItems.cantidad,
        precioUnitario: ordenItems.precioUnitario,
        subtotal: ordenItems.subtotal,
        notas: ordenItems.notas,
        nombre: platillos.nombre,
        imagenUrl: platillos.imagenUrl,
      })
      .from(ordenItems)
      .leftJoin(platillos, eq(ordenItems.platilloId, platillos.id))
      .where(eq(ordenItems.ordenId, ordenId))
      .orderBy(asc(ordenItems.id));

    const [mesero] = orden.atendidoPor
      ? await this.db
          .select({ name: users.name, lastname: users.lastname })
          .from(users)
          .where(eq(users.id, orden.atendidoPor))
          .limit(1)
      : [];

    const cajero = alias(users, 'cajero');
    const pagosOrden = await this.db
      .select({
        id: pagos.id,
        monto: pagos.monto,
        propina: pagos.propina,
        referencia: pagos.referencia,
        creadoEn: pagos.creadoEn,
        metodo: metodosPago.nombre,
        cajeroNombre: cajero.name,
        cajeroApellido: cajero.lastname,
      })
      .from(pagos)
      .leftJoin(metodosPago, eq(pagos.metodoPagoId, metodosPago.id))
      .leftJoin(cajero, eq(pagos.cobradoPor, cajero.id))
      .where(and(eq(pagos.ordenId, ordenId), eq(pagos.estatus, 'completado')))
      .orderBy(asc(pagos.id));

    const pagadoCents = pagosOrden.reduce(
      (sum, pago) => sum + centavos(Number(pago.monto ?? 0)),
      0,
    );
    const totalCents = centavos(Number(orden.total ?? 0));

    return {
      id: orden.id,
      folio: orden.folio,
      tipo: orden.tipo,
      mesa: mesa?.numero ?? null,
      estatus: orden.estatus,
      subtotal: orden.subtotal,
      propina: orden.propina,
      total: orden.total,
      pagado: pesos(pagadoCents),
      restante: pesos(Math.max(0, totalCents - pagadoCents)),
      numComensales: orden.numComensales ?? 1,
      mesero: mesero ? `${mesero.name} ${mesero.lastname}`.trim() : null,
      notasCocina: orden.notasCocina,
      tiempoApertura: orden.tiempoApertura,
      tiempoCierre: orden.tiempoCierre,
      pagos: pagosOrden.map((pago) => ({
        id: pago.id,
        metodo: pago.metodo,
        monto: pago.monto,
        propina: pago.propina,
        referencia: pago.referencia,
        cajero:
          [pago.cajeroNombre, pago.cajeroApellido].filter(Boolean).join(' ') ||
          null,
        creadoEn: pago.creadoEn,
      })),
      items: items.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        notas: item.notas,
        platillo: { nombre: item.nombre, imagenUrl: item.imagenUrl },
      })),
    };
  }

  /** PATCH /pedidos/:id/estatus — valida el paso y el rol antes de mover el pedido. */
  async cambiarEstatus(
    ordenId: string,
    estatus: EstatusOperativo,
    requester: OrderRequester,
  ) {
    const regla = TRANSICIONES[estatus];
    if (!regla.roles.includes(requester.roleId)) {
      throw new ForbiddenException(
        'Tu rol no puede hacer este cambio en el pedido.',
      );
    }

    const orden = await this.buscarOrden(ordenId);
    if (!regla.desde.includes(orden.estatus ?? '')) {
      throw new BadRequestException(
        `El pedido está en "${orden.estatus}" y no puede pasar a "${estatus}".`,
      );
    }

    const ahora = new Date().toISOString();
    // Condición sobre el estatus leído: si otro dispositivo ya lo movió, no se pisa.
    const actualizadas = await this.db
      .update(ordenes)
      .set({ estatus, actualizadoEn: ahora })
      .where(
        and(eq(ordenes.id, ordenId), eq(ordenes.estatus, orden.estatus ?? '')),
      )
      .returning({ id: ordenes.id });
    if (actualizadas.length === 0) {
      throw new ConflictException(
        'El pedido cambió mientras tanto. Actualiza y vuelve a intentar.',
      );
    }

    if (estatus === 'lista' || estatus === 'entregada') {
      await this.db
        .update(ordenItems)
        .set(
          estatus === 'lista'
            ? { tiempoListo: ahora }
            : { tiempoEntrega: ahora },
        )
        .where(eq(ordenItems.ordenId, ordenId));
    }

    // Sin `await`: la respuesta no espera al servicio de avisos.
    void this.avisar(estatus, orden);

    return { success: true, message: MENSAJE[estatus], ordenId, estatus };
  }

  /** GET /pedidos/metodos-pago — métodos con los que se puede cobrar en caja. */
  async listarMetodosPago() {
    const metodos = await this.db
      .select({
        id: metodosPago.id,
        nombre: metodosPago.nombre,
        tipo: metodosPago.tipo,
        aplicaPropina: metodosPago.aplicaPropina,
      })
      .from(metodosPago)
      .where(eq(metodosPago.activo, true))
      .orderBy(asc(metodosPago.id));

    return metodos
      .filter((metodo) => !esPasarelaEnLinea(metodo.nombre))
      .map((metodo) => ({
        ...metodo,
        aplicaPropina: metodo.aplicaPropina !== false,
        esEfectivo: esEfectivo(metodo),
      }));
  }

  /**
   * POST /pedidos/:id/cobrar — registra un pago en caja. Sin `monto` se cobra todo lo que falta;
   * con `monto` se cobra solo esa parte (cuenta separada) y el pedido se cierra cuando lo
   * pagado cubre el total. Lo que falta se calcula del total guardado y de los pagos ya
   * registrados, nunca de la app. La fila del pedido se bloquea (FOR UPDATE) durante la
   * transacción: dos cajas cobrando a la vez no pueden pasarse del total.
   */
  async cobrar(ordenId: string, dto: ChargeOrderDto, cajeroId: number) {
    const orden = await this.buscarOrden(ordenId);
    if (orden.estatus === 'pagada') {
      throw new ConflictException('Este pedido ya está pagado.');
    }
    if (!ESTATUS_COBRABLES.includes(orden.estatus ?? '')) {
      throw new BadRequestException(
        `Este pedido no se puede cobrar (estatus actual: ${orden.estatus}).`,
      );
    }
    if (centavos(Number(orden.total ?? 0)) <= 0) {
      throw new BadRequestException(
        'El total del pedido debe ser mayor a cero.',
      );
    }

    const [metodo] = await this.db
      .select()
      .from(metodosPago)
      .where(
        and(eq(metodosPago.id, dto.metodoPagoId), eq(metodosPago.activo, true)),
      )
      .limit(1);
    if (!metodo || esPasarelaEnLinea(metodo.nombre)) {
      throw new BadRequestException(
        'Elige un método de pago válido para cobrar en caja.',
      );
    }
    const propinaCents =
      metodo.aplicaPropina === false ? 0 : centavos(dto.propina ?? 0);

    return await this.db.transaction(async (tx) => {
      const [bloqueada] = await tx
        .select()
        .from(ordenes)
        .where(eq(ordenes.id, ordenId))
        .for('update');
      if (!bloqueada || !ESTATUS_COBRABLES.includes(bloqueada.estatus ?? '')) {
        throw new ConflictException('Este pedido ya fue cobrado.');
      }

      const [suma] = await tx
        .select({
          pagado: sql<string>`COALESCE(SUM(${pagos.monto}), 0)`,
          propinas: sql<string>`COALESCE(SUM(${pagos.propina}), 0)`,
        })
        .from(pagos)
        .where(
          and(eq(pagos.ordenId, ordenId), eq(pagos.estatus, 'completado')),
        );
      const totalCents = centavos(Number(bloqueada.total ?? 0));
      const pagadoCents = centavos(Number(suma?.pagado ?? 0));
      const restanteCents = totalCents - pagadoCents;
      if (restanteCents <= 0) {
        throw new ConflictException('Este pedido ya quedó cubierto.');
      }

      const montoCents =
        dto.monto === undefined ? restanteCents : centavos(dto.monto);
      if (montoCents <= 0) {
        throw new BadRequestException(
          'El monto a cobrar debe ser mayor a cero.',
        );
      }
      if (montoCents > restanteCents) {
        throw new BadRequestException(
          `El monto excede lo que falta por cobrar ($${pesos(restanteCents)}).`,
        );
      }

      const aPagarCents = montoCents + propinaCents;
      let cambioCents = 0;
      if (esEfectivo(metodo)) {
        if (dto.montoRecibido === undefined) {
          throw new BadRequestException('Indica con cuánto pagó el cliente.');
        }
        const recibidoCents = centavos(dto.montoRecibido);
        if (recibidoCents < aPagarCents) {
          throw new BadRequestException(
            `El efectivo recibido no alcanza: faltan $${pesos(aPagarCents - recibidoCents)}.`,
          );
        }
        cambioCents = recibidoCents - aPagarCents;
      }

      await tx.insert(pagos).values({
        ordenId,
        metodoPagoId: metodo.id,
        monto: pesos(montoCents),
        propina: pesos(propinaCents),
        cambio: pesos(cambioCents),
        referencia: dto.referencia?.trim() || dto.etiqueta?.trim() || null,
        cobradoPor: cajeroId,
        estatus: 'completado',
      });

      const nuevoRestante = restanteCents - montoCents;
      const propinasCents =
        centavos(Number(suma?.propinas ?? 0)) + propinaCents;
      const ahora = new Date().toISOString();
      await tx
        .update(ordenes)
        .set(
          nuevoRestante === 0
            ? {
                estatus: 'pagada',
                propina: pesos(propinasCents),
                tiempoCierre: ahora,
                actualizadoEn: ahora,
              }
            : { propina: pesos(propinasCents), actualizadoEn: ahora },
        )
        .where(eq(ordenes.id, ordenId));

      return {
        success: true,
        message:
          nuevoRestante === 0
            ? 'Pago registrado. El pedido quedó cerrado.'
            : `Pago registrado. Faltan $${pesos(nuevoRestante)} por cobrar.`,
        ordenId,
        metodo: metodo.nombre,
        total: pesos(montoCents),
        propina: pesos(propinaCents),
        totalCobrado: pesos(aPagarCents),
        cambio: pesos(cambioCents),
        pagado: pesos(pagadoCents + montoCents),
        restante: pesos(nuevoRestante),
        cerrada: nuevoRestante === 0,
      };
    });
  }
}
