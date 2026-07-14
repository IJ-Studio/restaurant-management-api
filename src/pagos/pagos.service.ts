import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  clientes,
  direccionesCliente,
  metodosPago,
  metodosPagoGuardados,
  ordenes,
  pagos,
  facturas,
} from '../database/schema/public.schema';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';
import Facturapi from 'facturapi';
import {
  CrearDireccionDto,
  GuardarMetodoPagoDto,
  CrearIntentoPagoDto,
  CrearFacturaDto,
} from './dto/pagos.dto';

@Injectable()
export class PagosService {
  private stripe: Stripe;
  private facturapi: any; // o el tipo Facturapi si lo prefieres

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {
    // Inicialización de Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY no está definida en las variables de entorno.');
    }
    this.stripe = new Stripe(stripeKey);

    // Inicialización de Facturapi
    const facturapiKey = process.env.FACTURAPI_TEST_KEY;
    if (!facturapiKey) {
      throw new Error('FACTURAPI_API_KEY no está definida en las variables de entorno.');
    }
    this.facturapi = new Facturapi(facturapiKey);
  }

  // Mismo patrón que OrdersService.resolverClienteId: resuelve (o crea)
  // el "cliente" ligado a un usuario autenticado.
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

  // ══════════════════════════════════════════════════════════════
  // DIRECCIONES DE ENVÍO
  // ══════════════════════════════════════════════════════════════

  async crearDireccion(dto: CrearDireccionDto) {
    const clienteId = await this.resolverClienteId(dto.usuarioId);

    if (dto.esPrincipal) {
      await this.db
        .update(direccionesCliente)
        .set({ esPrincipal: false })
        .where(eq(direccionesCliente.clienteId, clienteId));
    }

    const [nuevaDireccion] = await this.db
      .insert(direccionesCliente)
      .values({
        clienteId,
        alias: dto.alias || 'Casa',
        linea1: dto.linea1,
        linea2: dto.linea2,
        colonia: dto.colonia,
        referencias: dto.referencias,
        codigoPostal: dto.codigoPostal,
        ciudad: dto.ciudad,
        estado: dto.estado,
        esPrincipal: dto.esPrincipal ?? false,
      })
      .returning();

    return nuevaDireccion;
  }

  async listarDirecciones(usuarioId: number) {
    const [cliente] = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.userId, usuarioId))
      .limit(1);

    if (!cliente) return [];

    return await this.db
      .select()
      .from(direccionesCliente)
      .where(eq(direccionesCliente.clienteId, cliente.id));
  }

  async eliminarDireccion(id: number, usuarioId: number) {
    const clienteId = await this.resolverClienteId(usuarioId);

    const [direccion] = await this.db
      .select()
      .from(direccionesCliente)
      .where(and(eq(direccionesCliente.id, id), eq(direccionesCliente.clienteId, clienteId)))
      .limit(1);

    if (!direccion) {
      throw new NotFoundException('Esa dirección no existe o no te pertenece.');
    }

    await this.db.delete(direccionesCliente).where(eq(direccionesCliente.id, id));
    return { success: true, message: 'Dirección eliminada.' };
  }

  // ══════════════════════════════════════════════════════════════
  // MÉTODOS DE PAGO GUARDADOS (TOKENIZACIÓN CON STRIPE)
  //
  // Principio de seguridad: aquí NUNCA llega ni se guarda un número de
  // tarjeta ni un CVC. El frontend los captura directo con Stripe.js y
  // solo nos manda el "paymentMethodId" (un token) que Stripe genera.
  // ══════════════════════════════════════════════════════════════

  // Regresa el Customer de Stripe ligado a este cliente, reutilizando el
  // que ya exista (si tiene una tarjeta guardada previa) para no crear
  // Customers duplicados en el dashboard de Stripe.
  private async resolverStripeCustomerId(clienteId: string, usuarioId: number): Promise<string> {
    const [metodoExistente] = await this.db
      .select()
      .from(metodosPagoGuardados)
      .where(eq(metodosPagoGuardados.clienteId, clienteId))
      .limit(1);

    if (metodoExistente) return metodoExistente.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      metadata: { clienteId, usuarioId: String(usuarioId) },
    });

    return customer.id;
  }

  // Paso 1 del flujo de "guardar tarjeta": el frontend pide este Setup
  // Intent, lo usa con stripe.confirmCardSetup(), y de ahí obtiene el
  // paymentMethodId que luego manda a guardarMetodoPago().
  async crearSetupIntent(usuarioId: number) {
    const clienteId = await this.resolverClienteId(usuarioId);
    const stripeCustomerId = await this.resolverStripeCustomerId(clienteId, usuarioId);

    const setupIntent = await this.stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: setupIntent.client_secret,
    };
  }

  async guardarMetodoPago(dto: GuardarMetodoPagoDto) {
    const clienteId = await this.resolverClienteId(dto.usuarioId);
    const stripeCustomerId = await this.resolverStripeCustomerId(clienteId, dto.usuarioId);

    // Trae la metadata (marca, últimos 4, expiración) directo de Stripe.
    // El número completo y el CVC ya no existen en ningún lado en este
    // punto — Stripe los descarta después de la tokenización.
    const paymentMethod = await this.stripe.paymentMethods.retrieve(dto.paymentMethodId);

    if (!paymentMethod.card) {
      throw new BadRequestException('El método de pago recibido no es una tarjeta válida.');
    }

    if (dto.esPrincipal) {
      await this.db
        .update(metodosPagoGuardados)
        .set({ esPrincipal: false })
        .where(eq(metodosPagoGuardados.clienteId, clienteId));
    }

    const [guardado] = await this.db
      .insert(metodosPagoGuardados)
      .values({
        clienteId,
        pasarela: 'stripe',
        stripeCustomerId,
        stripePaymentMethodId: dto.paymentMethodId,
        marca: paymentMethod.card.brand,
        ultimos4: paymentMethod.card.last4,
        mesExpiracion: paymentMethod.card.exp_month,
        anioExpiracion: paymentMethod.card.exp_year,
        esPrincipal: dto.esPrincipal ?? false,
      })
      .returning();

    return this.formatearMetodoPago(guardado);
  }

  async listarMetodosPago(usuarioId: number) {
    const [cliente] = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.userId, usuarioId))
      .limit(1);

    if (!cliente) return [];

    const metodos = await this.db
      .select()
      .from(metodosPagoGuardados)
      .where(eq(metodosPagoGuardados.clienteId, cliente.id));

    return metodos.map((m) => this.formatearMetodoPago(m));
  }

  // Nunca se regresa stripePaymentMethodId ni stripeCustomerId al
  // frontend — no aportan nada a la UI y son referencias internas.
  private formatearMetodoPago(m: typeof metodosPagoGuardados.$inferSelect) {
    return {
      id: m.id,
      marca: m.marca,
      ultimos4: m.ultimos4,
      mesExpiracion: m.mesExpiracion,
      anioExpiracion: m.anioExpiracion,
      esPrincipal: m.esPrincipal,
    };
  }

  async eliminarMetodoPago(id: string, usuarioId: number) {
    const clienteId = await this.resolverClienteId(usuarioId);

    const [metodo] = await this.db
      .select()
      .from(metodosPagoGuardados)
      .where(and(eq(metodosPagoGuardados.id, id), eq(metodosPagoGuardados.clienteId, clienteId)))
      .limit(1);

    if (!metodo) {
      throw new NotFoundException('Ese método de pago no existe o no te pertenece.');
    }

    // Best-effort: si falla en Stripe (ya estaba desvinculada, etc.) no
    // bloqueamos el borrado en nuestra BD.
    await this.stripe.paymentMethods.detach(metodo.stripePaymentMethodId).catch(() => null);
    await this.db.delete(metodosPagoGuardados).where(eq(metodosPagoGuardados.id, id));

    return { success: true, message: 'Método de pago eliminado.' };
  }

  // ══════════════════════════════════════════════════════════════
  // PROCESAR EL PAGO DE UNA ORDEN
  // ══════════════════════════════════════════════════════════════

  async crearIntentoPago(dto: CrearIntentoPagoDto) {
    const clienteId = await this.resolverClienteId(dto.usuarioId);

    const [orden] = await this.db
      .select()
      .from(ordenes)
      .where(eq(ordenes.id, dto.ordenId))
      .limit(1);

    if (!orden) {
      throw new NotFoundException('La orden no existe.');
    }
    if (orden.clienteId !== clienteId) {
      throw new BadRequestException('Esta orden no te pertenece.');
    }
    if (orden.estatus !== 'pendiente') {
      throw new BadRequestException(
        `Esta orden ya no admite pago (estatus actual: ${orden.estatus}).`,
      );
    }

    // Validación para evitar null en el total
    if (orden.total === null) {
      throw new BadRequestException('El total de la orden no puede ser nulo.');
    }

    if (dto.direccionId) {
      await this.db
        .update(ordenes)
        .set({ direccionEnvioId: dto.direccionId })
        .where(eq(ordenes.id, dto.ordenId));
    }

    // El monto SIEMPRE se calcula del total ya guardado en la orden, en
    // el backend. Nunca se confía en un monto mandado desde el frontend.
    const montoEnCentavos = Math.round(parseFloat(orden.total) * 100);
    if (montoEnCentavos <= 0) {
      throw new BadRequestException('El total de la orden debe ser mayor a cero.');
    }

    let paymentMethodId = dto.paymentMethodId;
    let stripeCustomerId: string | undefined;

    if (dto.metodoPagoGuardadoId) {
      const [guardado] = await this.db
        .select()
        .from(metodosPagoGuardados)
        .where(
          and(
            eq(metodosPagoGuardados.id, dto.metodoPagoGuardadoId),
            eq(metodosPagoGuardados.clienteId, clienteId),
          ),
        )
        .limit(1);

      if (!guardado) {
        throw new NotFoundException('Ese método de pago guardado no existe o no te pertenece.');
      }

      paymentMethodId = guardado.stripePaymentMethodId;
      stripeCustomerId = guardado.stripeCustomerId;
    }

    // Idempotency key = ordenId: si el usuario da doble clic o hay un
    // retry de red, Stripe no duplica el cobro.
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: montoEnCentavos,
        currency: 'mxn',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: !!paymentMethodId,
        automatic_payment_methods: paymentMethodId ? undefined : { enabled: true },
        off_session: !!stripeCustomerId,
        metadata: { ordenId: dto.ordenId, clienteId },
      },
      { idempotencyKey: `orden-${dto.ordenId}` },
    );

    return {
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    };
  }

  // Se ejecuta SOLO desde el webhook, cuando Stripe confirma el pago de
  // forma asíncrona. Nunca se llama directo desde una request del cliente.
  private async marcarOrdenComoPagada(paymentIntent: Stripe.PaymentIntent) {
    const ordenId = paymentIntent.metadata?.ordenId;
    if (!ordenId) return;

    const [metodoStripe] = await this.db
      .select()
      .from(metodosPago)
      .where(eq(metodosPago.nombre, 'Tarjeta en línea (Stripe)'))
      .limit(1);

    if (!metodoStripe) {
      console.error(
        'Falta la fila "Tarjeta en línea (Stripe)" en metodos_pago. Créala antes de recibir pagos (ver Fase 0 del plan).',
      );
      return;
    }

    await this.db.update(ordenes).set({ estatus: 'pagada' }).where(eq(ordenes.id, ordenId));

    await this.db.insert(pagos).values({
      ordenId,
      metodoPagoId: metodoStripe.id,
      monto: (paymentIntent.amount / 100).toString(),
      pasarela: 'stripe',
      idTransaccionPasarela: paymentIntent.id,
      estatus: 'completado',
    });
  }

  async manejarWebhookStripe(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch (err: any) {
      throw new BadRequestException(`Firma de webhook inválida: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.marcarOrdenComoPagada(event.data.object as Stripe.PaymentIntent);
    }

    if (event.type === 'payment_intent.payment_failed') {
      console.error(
        'Pago fallido en Stripe:',
        (event.data.object as Stripe.PaymentIntent).id,
      );
    }

    return { received: true };
  }

  // ══════════════════════════════════════════════════════════════
  // FACTURACIÓN (CFDI VÍA FACTURAPI)
  // ══════════════════════════════════════════════════════════════

  async crearFactura(dto: CrearFacturaDto) {
    const clienteId = await this.resolverClienteId(dto.usuarioId);

    const [orden] = await this.db
      .select()
      .from(ordenes)
      .where(eq(ordenes.id, dto.ordenId))
      .limit(1);

    if (!orden) {
      throw new NotFoundException('La orden no existe.');
    }
    if (orden.clienteId !== clienteId) {
      throw new BadRequestException('Esta orden no te pertenece.');
    }
    if (orden.estatus !== 'pagada') {
      throw new BadRequestException('Solo se puede facturar una orden ya pagada.');
    }

    // Validación para evitar null en el total
    if (orden.total === null) {
      throw new BadRequestException('El total de la orden no puede ser nulo.');
    }

    const [facturaExistente] = await this.db
      .select()
      .from(facturas)
      .where(eq(facturas.ordenId, dto.ordenId))
      .limit(1);

    if (facturaExistente) {
      throw new BadRequestException('Esta orden ya tiene una factura generada.');
    }

    const total = parseFloat(orden.total);
    const subtotal = +(total / 1.16).toFixed(2);
    const iva = +(total - subtotal).toFixed(2);

    let facturapiInvoice: any;
    try {
      facturapiInvoice = await this.facturapi.invoices.create({
        customer: {
          legal_name: dto.razonSocial,
          tax_id: dto.rfc,
          tax_system: dto.regimenFiscal,
          email: dto.email,
          address: { zip: dto.codigoPostalFiscal },
        },
        items: [
          {
            quantity: 1,
            product: {
              description: `Pedido #${dto.ordenId.slice(0, 8).toUpperCase()} - Restaurante El Quijote`,
              product_key: '90101501', // "Servicios de restaurante" (catálogo SAT)
              price: subtotal,
              taxes: [{ type: 'IVA', rate: 0.16 }],
            },
          },
        ],
        use: dto.usoCfdi,
        payment_form: '31', // "Intermediario pagos" (cobro con tarjeta en línea vía pasarela)
      });
    } catch (err: any) {
      console.error('Error de Facturapi al timbrar:', err);
      throw new BadRequestException(
        `No se pudo generar la factura: ${err.message || 'error desconocido de Facturapi'}`,
      );
    }

    // Guarda RFC/razón social en el cliente para prellenarlos la próxima
    // vez que pida factura.
    await this.db
      .update(clientes)
      .set({ rfc: dto.rfc, razonSocial: dto.razonSocial, requiereFactura: true })
      .where(eq(clientes.id, clienteId));

    const [facturaGuardada] = await this.db
      .insert(facturas)
      .values({
        ordenId: dto.ordenId,
        userId: dto.usuarioId,
        folioFiscal: facturapiInvoice.uuid ?? null,
        facturapiInvoiceId: facturapiInvoice.id,
        rfcReceptor: dto.rfc,
        razonSocial: dto.razonSocial,
        usoCfdi: dto.usoCfdi,
        regimenFiscal: dto.regimenFiscal,
        subtotal: subtotal.toString(),
        iva: iva.toString(),
        total: total.toString(),
      })
      .returning();

    return facturaGuardada;
  }

  async obtenerFacturaPorOrden(ordenId: string) {
    const [factura] = await this.db
      .select()
      .from(facturas)
      .where(eq(facturas.ordenId, ordenId))
      .limit(1);

    if (!factura) {
      throw new NotFoundException('No hay factura generada para esta orden.');
    }

    return factura;
  }

  // Descarga el PDF/XML bajo demanda directo de Facturapi (no guardamos
  // el archivo nosotros mismos, solo el ID de la factura en Facturapi).
  async descargarFacturaArchivo(ordenId: string, tipo: 'pdf' | 'xml'): Promise<Buffer> {
    const factura = await this.obtenerFacturaPorOrden(ordenId);

    if (!factura.facturapiInvoiceId) {
      throw new BadRequestException('Esta factura no tiene un ID de Facturapi asociado.');
    }

    const archivo =
      tipo === 'pdf'
        ? await this.facturapi.invoices.downloadPdf(factura.facturapiInvoiceId)
        : await this.facturapi.invoices.downloadXml(factura.facturapiInvoiceId);

    return Buffer.from(archivo as any);
  }
}
