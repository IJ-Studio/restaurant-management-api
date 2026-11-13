import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { CorreoService, type ResultadoCorreo } from '../correo/correo.service';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { clientes, ordenes, users } from '../database/schema/public.schema';
import {
  solicitudesFactura,
  type EstatusSolicitudFactura,
} from '../database/schema/solicitudes-factura.schema';
import type { CrearFacturaDto } from '../pagos/dto/pagos.dto';
import { PagosService } from '../pagos/pagos.service';

export const MENSAJES = {
  registrada:
    'Tu solicitud de factura quedó registrada. Te la enviamos en cuanto el restaurante la emita.',
  noEsTuya: 'Esta orden no te pertenece.',
  yaAtendida: 'Esta solicitud ya fue atendida.',
  sinPago: 'La orden todavía no aparece como pagada: no se puede facturar aún.',
  motivo: 'Escribe el motivo del rechazo (al menos 5 caracteres).',
};

/**
 * Solicitudes de factura en cola (Fase 4.1). El cliente pide la factura al pagar —aunque el webhook
 * de Stripe aún no confirme el pago— y el administrador la emite o la rechaza con motivo.
 */
@Injectable()
export class SolicitudesFacturaService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly pagos: PagosService,
    private readonly correo: CorreoService,
  ) {}

  /** Una sola solicitud por orden: si ya existe, se actualizan los datos mientras siga pendiente. */
  async solicitar(dto: CrearFacturaDto, usuarioId: number) {
    const [orden] = await this.db
      .select({ id: ordenes.id, clienteId: ordenes.clienteId })
      .from(ordenes)
      .where(eq(ordenes.id, dto.ordenId))
      .limit(1);
    if (!orden) throw new NotFoundException('La orden no existe.');
    const [cliente] = await this.db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.userId, usuarioId))
      .limit(1);
    if (!cliente || orden.clienteId !== cliente.id) {
      throw new BadRequestException(MENSAJES.noEsTuya);
    }

    const datos = Object.fromEntries(
      Object.entries(dto).filter(
        ([clave, valor]) => clave !== 'ordenId' && typeof valor === 'string',
      ),
    ) as Record<string, string>;
    const [fila] = await this.db
      .insert(solicitudesFactura)
      .values({ ordenId: dto.ordenId, usuarioId, datos })
      .onConflictDoUpdate({
        target: solicitudesFactura.ordenId,
        set: { datos },
        setWhere: sql`${solicitudesFactura.estatus} = 'pendiente'`,
      })
      .returning({
        id: solicitudesFactura.id,
        estatus: solicitudesFactura.estatus,
      });
    if (!fila) throw new ConflictException(MENSAJES.yaAtendida);
    return { id: fila.id, estatus: fila.estatus, mensaje: MENSAJES.registrada };
  }

  /** Estado de la solicitud de una orden propia (página de éxito del pago). */
  async deOrden(ordenId: string, usuarioId: number) {
    const [fila] = await this.db
      .select({
        id: solicitudesFactura.id,
        estatus: solicitudesFactura.estatus,
        motivo: solicitudesFactura.motivo,
      })
      .from(solicitudesFactura)
      .where(
        and(
          eq(solicitudesFactura.ordenId, ordenId),
          eq(solicitudesFactura.usuarioId, usuarioId),
        ),
      )
      .limit(1);
    if (!fila)
      throw new NotFoundException(
        'No hay solicitud de factura para esta orden.',
      );
    return fila;
  }

  /** Bandeja del administrador, las más antiguas primero. */
  async listar(estatus: EstatusSolicitudFactura = 'pendiente') {
    return this.db
      .select({
        id: solicitudesFactura.id,
        ordenId: solicitudesFactura.ordenId,
        estatus: solicitudesFactura.estatus,
        motivo: solicitudesFactura.motivo,
        rfc: sql<string | null>`${solicitudesFactura.datos} ->> 'rfc'`,
        razonSocial: sql<
          string | null
        >`${solicitudesFactura.datos} ->> 'razonSocial'`,
        email: sql<string | null>`${solicitudesFactura.datos} ->> 'email'`,
        cliente: sql<string>`trim(${users.name} || ' ' || ${users.lastname})`,
        totalOrden: ordenes.total,
        estatusOrden: ordenes.estatus,
        creadoEn: solicitudesFactura.creadoEn,
        atendidaEn: solicitudesFactura.atendidaEn,
      })
      .from(solicitudesFactura)
      .innerJoin(users, eq(users.id, solicitudesFactura.usuarioId))
      .innerJoin(ordenes, eq(ordenes.id, solicitudesFactura.ordenId))
      .where(eq(solicitudesFactura.estatus, estatus))
      .orderBy(asc(solicitudesFactura.creadoEn))
      .limit(200);
  }

  private async pendiente(id: number) {
    const [solicitud] = await this.db
      .select()
      .from(solicitudesFactura)
      .where(eq(solicitudesFactura.id, id))
      .limit(1);
    if (!solicitud) throw new NotFoundException('La solicitud no existe.');
    if (solicitud.estatus !== 'pendiente')
      throw new ConflictException(MENSAJES.yaAtendida);
    return solicitud;
  }

  /** Emite la factura con Facturapi (a nombre del cliente) y, si está activo, la manda por correo. */
  async emitir(
    id: number,
    adminId: number,
  ): Promise<{
    facturaId: string;
    folio: string | null;
    correo: ResultadoCorreo;
  }> {
    const solicitud = await this.pendiente(id);
    const [orden] = await this.db
      .select({ estatus: ordenes.estatus })
      .from(ordenes)
      .where(eq(ordenes.id, solicitud.ordenId))
      .limit(1);
    if (orden?.estatus !== 'pagada')
      throw new BadRequestException(MENSAJES.sinPago);

    const factura = await this.pagos.crearFactura(
      { ...solicitud.datos, ordenId: solicitud.ordenId },
      solicitud.usuarioId,
    );
    await this.db
      .update(solicitudesFactura)
      .set({
        estatus: 'emitida',
        facturaId: factura.id,
        atendidaPor: adminId,
        atendidaEn: sql`now()`,
      })
      .where(eq(solicitudesFactura.id, id));

    const para = solicitud.datos.email;
    const correo = para
      ? await this.correo.enviarFactura({
          para,
          nombre: solicitud.datos.razonSocial ?? 'Cliente',
          folio: factura.folio ?? factura.id,
        })
      : { enviado: false, motivo: 'La solicitud no trae correo.' };
    return { facturaId: factura.id, folio: factura.folio ?? null, correo };
  }

  async rechazar(id: number, motivo: string, adminId: number) {
    const texto = motivo?.trim() ?? '';
    if (texto.length < 5 || texto.length > 300)
      throw new BadRequestException(MENSAJES.motivo);
    await this.pendiente(id);
    await this.db
      .update(solicitudesFactura)
      .set({
        estatus: 'rechazada',
        motivo: texto,
        atendidaPor: adminId,
        atendidaEn: sql`now()`,
      })
      .where(eq(solicitudesFactura.id, id));
    return { id, estatus: 'rechazada' as const };
  }
}
