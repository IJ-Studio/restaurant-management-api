import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

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
} from '../database/schema/public.schema';
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
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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

    return {
      id: orden.id,
      folio: orden.folio,
      tipo: orden.tipo,
      mesa: mesa?.numero ?? null,
      estatus: orden.estatus,
      subtotal: orden.subtotal,
      propina: orden.propina,
      total: orden.total,
      notasCocina: orden.notasCocina,
      tiempoApertura: orden.tiempoApertura,
      tiempoCierre: orden.tiempoCierre,
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
   * POST /pedidos/:id/cobrar — registra el pago en caja y cierra el pedido.
   * El monto sale del total guardado en la orden, nunca de la app. En efectivo se exige que
   * alcance lo recibido y se calcula el cambio. Todo va en una transacción.
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

    const totalCents = centavos(Number(orden.total ?? 0));
    if (totalCents <= 0) {
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
    const aPagarCents = totalCents + propinaCents;

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

    const ahora = new Date().toISOString();
    await this.db.transaction(async (tx) => {
      // Solo se cierra si sigue cobrable: dos cajas cobrando a la vez no generan dos pagos.
      const cerradas = await tx
        .update(ordenes)
        .set({
          estatus: 'pagada',
          propina: pesos(propinaCents),
          tiempoCierre: ahora,
          actualizadoEn: ahora,
        })
        .where(
          and(
            eq(ordenes.id, ordenId),
            inArray(ordenes.estatus, ESTATUS_COBRABLES),
          ),
        )
        .returning({ id: ordenes.id });
      if (cerradas.length === 0) {
        throw new ConflictException('Este pedido ya fue cobrado.');
      }

      await tx.insert(pagos).values({
        ordenId,
        metodoPagoId: metodo.id,
        monto: pesos(totalCents),
        propina: pesos(propinaCents),
        cambio: pesos(cambioCents),
        referencia: dto.referencia?.trim() || null,
        cobradoPor: cajeroId,
        estatus: 'completado',
      });
    });

    return {
      success: true,
      message: 'Pago registrado. El pedido quedó cerrado.',
      ordenId,
      metodo: metodo.nombre,
      total: pesos(totalCents),
      propina: pesos(propinaCents),
      totalCobrado: pesos(aPagarCents),
      cambio: pesos(cambioCents),
    };
  }
}
