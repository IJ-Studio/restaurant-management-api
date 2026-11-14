import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import {
  cierresCaja,
  inventarioMermas,
  inventarioProductos,
  logsAuditoria,
  mesas,
  metodosPago,
  ordenes,
  ordenItems,
  pagos,
  platillos,
  users,
} from '../database/schema/public.schema';
import { aPesos, type Calculo } from '../common/calculo';
import { diaLocal } from '../reglas/horario';
import type {
  CloseCashDto,
  CreateIncidentDto,
  CreateWasteDto,
  OpenCashDto,
} from './dto/operations.dto';

/** Las incidencias se guardan en la bitácora con esta "tabla", sin crear tablas nuevas. */
export const TABLA_INCIDENCIAS = 'incidencias_cocina';

type Clase = 'efectivo' | 'tarjeta' | 'digital';

const centavos = (monto: unknown) => Math.round(Number(monto ?? 0) * 100);
const pesos = (cents: number) => (cents / 100).toFixed(2);
const nombre = (n?: string | null, a?: string | null) =>
  [n, a].filter(Boolean).join(' ').trim() || null;

/** Clase del método para el corte: efectivo, tarjeta o pagos digitales. */
export function claseDeMetodo(
  tipo: string | null,
  metodo: string | null,
): Clase {
  const texto = `${tipo ?? ''} ${metodo ?? ''}`.toLowerCase();
  if (texto.includes('efectivo')) return 'efectivo';
  if (texto.includes('tarjeta')) return 'tarjeta';
  return 'digital';
}

/** Inicio y fin del día de hoy (hora del servidor), como en el resto del Dashboard. */
/**
 * «Hoy» en la hora del restaurante (no la del servidor: Render corre en UTC y a las 18:00 de
 * México ya era «mañana»). Es la zona por defecto de `restaurante.zona_horaria`.
 */
export function rangoDeHoy(ahora = new Date(), zona = 'America/Mexico_City') {
  const { inicio, fin } = diaLocal(ahora, zona);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

@Injectable()
export class OperationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async nombreDeUsuario(userId: number): Promise<string> {
    const [user] = await this.db
      .select({ name: users.name, lastname: users.lastname })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return nombre(user?.name, user?.lastname) ?? `Usuario ${userId}`;
  }

  // ── Incidencias de cocina ──────────────────────────────────────────────────

  async reportarIncidencia(dto: CreateIncidentDto, userId: number) {
    let mesa: string | null = null;
    if (dto.ordenId) {
      const [orden] = await this.db
        .select({ id: ordenes.id, mesa: mesas.numero })
        .from(ordenes)
        .leftJoin(mesas, eq(ordenes.mesaId, mesas.id))
        .where(eq(ordenes.id, dto.ordenId))
        .limit(1);
      if (!orden) throw new NotFoundException('El pedido no existe.');
      mesa = orden.mesa ?? null;
    }

    const datos = {
      tipo: dto.tipo,
      mensaje: dto.mensaje?.trim() || null,
      minutos: dto.tipo === 'retraso' ? (dto.minutos ?? null) : null,
      mesa,
    };
    const [registro] = await this.db
      .insert(logsAuditoria)
      .values({
        userId,
        tabla: TABLA_INCIDENCIAS,
        registroId: dto.ordenId ?? null,
        accion: 'REPORTE',
        datosDespues: datos,
      })
      .returning({ id: logsAuditoria.id, creadoEn: logsAuditoria.creadoEn });

    return {
      success: true,
      message:
        dto.tipo === 'retraso'
          ? 'Se avisó del retraso al personal de piso.'
          : 'Incidencia reportada.',
      incidencia: {
        id: String(registro.id),
        ...datos,
        ordenId: dto.ordenId ?? null,
        reportadoPor: await this.nombreDeUsuario(userId),
        creadoEn: registro.creadoEn,
      },
    };
  }

  /** Incidencias de hoy; con `ordenId`, solo las de ese pedido. */
  async listarIncidencias(ordenId?: string) {
    const { inicio } = rangoDeHoy();
    const rows = await this.db
      .select({
        id: logsAuditoria.id,
        registroId: logsAuditoria.registroId,
        datos: logsAuditoria.datosDespues,
        creadoEn: logsAuditoria.creadoEn,
        name: users.name,
        lastname: users.lastname,
      })
      .from(logsAuditoria)
      .leftJoin(users, eq(logsAuditoria.userId, users.id))
      .where(
        and(
          eq(logsAuditoria.tabla, TABLA_INCIDENCIAS),
          ordenId
            ? eq(logsAuditoria.registroId, ordenId)
            : gte(logsAuditoria.creadoEn, inicio),
        ),
      )
      .orderBy(desc(logsAuditoria.creadoEn))
      .limit(50);

    return rows.map((row) => {
      const datos = (row.datos ?? {}) as Record<string, unknown>;
      return {
        id: String(row.id),
        ordenId: row.registroId,
        tipo: typeof datos.tipo === 'string' ? datos.tipo : 'otro',
        mensaje: typeof datos.mensaje === 'string' ? datos.mensaje : null,
        minutos: typeof datos.minutos === 'number' ? datos.minutos : null,
        mesa: typeof datos.mesa === 'string' ? datos.mesa : null,
        reportadoPor: nombre(row.name, row.lastname),
        creadoEn: row.creadoEn,
      };
    });
  }

  // ── Mermas ─────────────────────────────────────────────────────────────────

  async listarProductos() {
    return await this.db
      .select({
        id: inventarioProductos.id,
        name: inventarioProductos.name,
        category: inventarioProductos.category,
        unit: inventarioProductos.unit,
        stock: inventarioProductos.stock,
        // Aditivo (web, cocina): el mínimo para marcar existencias bajas. La móvil ignora el campo.
        minStock: inventarioProductos.minStock,
        costPerUnit: inventarioProductos.costPerUnit,
      })
      .from(inventarioProductos)
      .where(eq(inventarioProductos.active, true))
      .orderBy(asc(inventarioProductos.name));
  }

  /** Registra la merma; si es de un producto del inventario, lo descuenta y calcula el costo. */
  async registrarMerma(dto: CreateWasteDto, userId: number) {
    if (!dto.productId && !dto.productName?.trim()) {
      throw new BadRequestException(
        'Elige un producto del inventario o escribe qué se perdió.',
      );
    }
    const reportedBy = await this.nombreDeUsuario(userId);

    return await this.db.transaction(async (tx) => {
      let productName = dto.productName?.trim() ?? '';
      let unit = dto.unit?.trim() || 'pza';
      let costCents = 0;
      let stockRestante: string | null = null;

      if (dto.productId) {
        const [producto] = await tx
          .select()
          .from(inventarioProductos)
          .where(
            and(
              eq(inventarioProductos.id, dto.productId),
              eq(inventarioProductos.active, true),
            ),
          )
          .for('update');
        if (!producto)
          throw new NotFoundException('Ese producto no está en el inventario.');

        productName = producto.name;
        unit = producto.unit;
        costCents = Math.round(dto.quantity * centavos(producto.costPerUnit));
        const nuevo = Math.max(0, Number(producto.stock) - dto.quantity);
        stockRestante = nuevo.toFixed(3);
        await tx
          .update(inventarioProductos)
          .set({ stock: stockRestante, lastUpdated: new Date().toISOString() })
          .where(eq(inventarioProductos.id, producto.id));
      }

      const [merma] = await tx
        .insert(inventarioMermas)
        .values({
          productId: dto.productId ?? null,
          productName,
          quantity: dto.quantity.toString(),
          unit,
          reason: dto.reason,
          justification: dto.justification.trim(),
          reportedBy,
          reportadoPorId: userId,
          cost: pesos(costCents),
        })
        .returning();

      return {
        success: true,
        message: dto.productId
          ? `Merma registrada. Quedan ${stockRestante} ${unit} en inventario.`
          : 'Merma registrada.',
        merma: { ...merma, stockRestante },
      };
    });
  }

  async listarMermasDeHoy() {
    const { inicio } = rangoDeHoy();
    return await this.db
      .select()
      .from(inventarioMermas)
      .where(gte(inventarioMermas.createdAt, inicio))
      .orderBy(desc(inventarioMermas.createdAt))
      .limit(50);
  }

  // ── Corte de caja ──────────────────────────────────────────────────────────

  private async cajaAbierta(userId: number) {
    const [caja] = await this.db
      .select()
      .from(cierresCaja)
      .where(
        and(eq(cierresCaja.userId, userId), eq(cierresCaja.estatus, 'abierto')),
      )
      .orderBy(desc(cierresCaja.fechaApertura))
      .limit(1);
    return caja;
  }

  /** Totales cobrados por el cajero desde que abrió su caja, separados por clase de método. */
  private async totalesDesde(userId: number, desde: string) {
    const rows = await this.db
      .select({
        monto: pagos.monto,
        propina: pagos.propina,
        tipo: metodosPago.tipo,
        metodo: metodosPago.nombre,
      })
      .from(pagos)
      .leftJoin(metodosPago, eq(pagos.metodoPagoId, metodosPago.id))
      .where(
        and(
          eq(pagos.cobradoPor, userId),
          eq(pagos.estatus, 'completado'),
          gte(pagos.creadoEn, desde),
        ),
      );

    const cents = {
      efectivo: 0,
      tarjeta: 0,
      digital: 0,
      propinas: 0,
      propinasEfectivo: 0,
    };
    for (const row of rows) {
      const clase = claseDeMetodo(row.tipo, row.metodo);
      cents[clase] += centavos(row.monto);
      cents.propinas += centavos(row.propina);
      if (clase === 'efectivo') cents.propinasEfectivo += centavos(row.propina);
    }
    return { cents, numPagos: rows.length };
  }

  private resumenCaja(
    caja: typeof cierresCaja.$inferSelect,
    totales: Awaited<ReturnType<OperationsService['totalesDesde']>>,
  ) {
    const { cents } = totales;
    const fondo = centavos(caja.fondoInicial);
    // En la caja queda el fondo, lo cobrado en efectivo y las propinas en efectivo (el cambio ya salió).
    const esperado = fondo + cents.efectivo + cents.propinasEfectivo;
    const periodo = {
      inicio: caja.fechaApertura,
      fin: caja.fechaCierre ?? new Date().toISOString(),
    };
    const filtros = {
      cajero: 'quien abrió esta caja',
      'estatus del pago': 'completado',
    };
    const calculos: Record<string, Calculo> = {
      efectivoEsperado: {
        formula:
          'efectivo esperado = fondo inicial + ventas en efectivo + propinas en efectivo',
        operacion: 'suma',
        periodo,
        filtros,
        datos: [
          { clave: 'fondo inicial', valor: aPesos(fondo) },
          { clave: 'ventas en efectivo', valor: aPesos(cents.efectivo) },
          {
            clave: 'propinas en efectivo',
            valor: aPesos(cents.propinasEfectivo),
          },
        ],
      },
      totalVentas: {
        formula: 'cobrado = efectivo + tarjeta + digital',
        operacion: 'suma',
        periodo,
        filtros,
        datos: [
          { clave: 'efectivo', valor: aPesos(cents.efectivo) },
          { clave: 'tarjeta', valor: aPesos(cents.tarjeta) },
          { clave: 'digital', valor: aPesos(cents.digital) },
        ],
      },
      propinas: {
        formula: 'propinas = propinas en efectivo + propinas con otros métodos',
        operacion: 'suma',
        periodo,
        filtros,
        datos: [
          { clave: 'en efectivo', valor: aPesos(cents.propinasEfectivo) },
          {
            clave: 'con otros métodos',
            valor: aPesos(cents.propinas - cents.propinasEfectivo),
          },
        ],
      },
    };
    return {
      calculos,
      abierta: caja.estatus === 'abierto',
      id: caja.id,
      fechaApertura: caja.fechaApertura,
      fechaCierre: caja.fechaCierre,
      fondoInicial: pesos(fondo),
      efectivoVentas: pesos(cents.efectivo),
      tarjetaVentas: pesos(cents.tarjeta),
      digitalVentas: pesos(cents.digital),
      totalVentas: pesos(cents.efectivo + cents.tarjeta + cents.digital),
      propinas: pesos(cents.propinas),
      numPagos: totales.numPagos,
      efectivoEsperado: pesos(esperado),
      efectivoContado: caja.efectivoContado,
      diferencia: caja.diferencia,
    };
  }

  async cajaActual(userId: number) {
    const caja = await this.cajaAbierta(userId);
    if (!caja) return { abierta: false as const };
    return this.resumenCaja(
      caja,
      await this.totalesDesde(userId, caja.fechaApertura),
    );
  }

  async abrirCaja(userId: number, dto: OpenCashDto) {
    if (await this.cajaAbierta(userId)) {
      throw new ConflictException(
        'Ya tienes una caja abierta. Ciérrala antes de abrir otra.',
      );
    }
    const [caja] = await this.db
      .insert(cierresCaja)
      .values({
        userId,
        fechaApertura: new Date().toISOString(),
        fondoInicial: dto.fondoInicial.toFixed(2),
        estatus: 'abierto',
      })
      .returning();
    return {
      success: true,
      message: 'Caja abierta.',
      caja: this.resumenCaja(caja, {
        cents: {
          efectivo: 0,
          tarjeta: 0,
          digital: 0,
          propinas: 0,
          propinasEfectivo: 0,
        },
        numPagos: 0,
      }),
    };
  }

  async cerrarCaja(userId: number, dto: CloseCashDto) {
    const caja = await this.cajaAbierta(userId);
    if (!caja) throw new BadRequestException('No tienes una caja abierta.');

    const totales = await this.totalesDesde(userId, caja.fechaApertura);
    const resumen = this.resumenCaja(caja, totales);
    const diferenciaCents =
      centavos(dto.efectivoContado) - centavos(resumen.efectivoEsperado);

    const [cerrada] = await this.db
      .update(cierresCaja)
      .set({
        fechaCierre: new Date().toISOString(),
        efectivoVentas: resumen.efectivoVentas,
        tarjetaVentas: resumen.tarjetaVentas,
        digitalVentas: resumen.digitalVentas,
        totalVentas: resumen.totalVentas,
        propinas: resumen.propinas,
        efectivoContado: dto.efectivoContado.toFixed(2),
        diferencia: pesos(diferenciaCents),
        notas: dto.notas?.trim() || null,
        estatus: 'cerrado',
      })
      .where(
        and(eq(cierresCaja.id, caja.id), eq(cierresCaja.estatus, 'abierto')),
      )
      .returning();
    if (!cerrada) throw new ConflictException('Esta caja ya se cerró.');

    let message = 'Caja cerrada. El efectivo cuadra.';
    if (diferenciaCents > 0)
      message = `Caja cerrada con $${pesos(diferenciaCents)} de sobrante.`;
    if (diferenciaCents < 0)
      message = `Caja cerrada con $${pesos(-diferenciaCents)} de faltante.`;
    return { success: true, message, caja: this.resumenCaja(cerrada, totales) };
  }

  /** Cortes recientes de todo el personal (administrador). */
  async listarCortes() {
    const rows = await this.db
      .select({ caja: cierresCaja, name: users.name, lastname: users.lastname })
      .from(cierresCaja)
      .leftJoin(users, eq(cierresCaja.userId, users.id))
      .orderBy(desc(cierresCaja.fechaApertura))
      .limit(20);
    return rows.map((row) => ({
      ...row.caja,
      cajero: nombre(row.name, row.lastname),
    }));
  }

  // ── Resumen del día para el administrador ─────────────────────────────────

  async resumenDelDia() {
    const { inicio, fin } = rangoDeHoy();
    const cajero = alias(users, 'cajero');
    const mesero = alias(users, 'mesero');

    const [pagosHoy, ordenesHoy, top, incidencias, mermas, cajas] =
      await Promise.all([
        this.db
          .select({
            ordenId: pagos.ordenId,
            monto: pagos.monto,
            propina: pagos.propina,
            creadoEn: pagos.creadoEn,
            metodo: metodosPago.nombre,
            tipo: metodosPago.tipo,
            cajeroId: pagos.cobradoPor,
            cajeroNombre: cajero.name,
            cajeroApellido: cajero.lastname,
            mesa: mesas.numero,
          })
          .from(pagos)
          .leftJoin(metodosPago, eq(pagos.metodoPagoId, metodosPago.id))
          .leftJoin(cajero, eq(pagos.cobradoPor, cajero.id))
          .leftJoin(ordenes, eq(pagos.ordenId, ordenes.id))
          .leftJoin(mesas, eq(ordenes.mesaId, mesas.id))
          .where(
            and(
              eq(pagos.estatus, 'completado'),
              gte(pagos.creadoEn, inicio),
              lt(pagos.creadoEn, fin),
            ),
          )
          .orderBy(desc(pagos.creadoEn)),
        this.db
          .select({
            id: ordenes.id,
            estatus: ordenes.estatus,
            total: ordenes.total,
            comensales: ordenes.numComensales,
            meseroId: ordenes.atendidoPor,
            meseroNombre: mesero.name,
            meseroApellido: mesero.lastname,
          })
          .from(ordenes)
          .leftJoin(mesero, eq(ordenes.atendidoPor, mesero.id))
          .where(
            and(
              gte(ordenes.tiempoApertura, inicio),
              lt(ordenes.tiempoApertura, fin),
            ),
          ),
        this.db
          .select({
            nombre: platillos.nombre,
            cantidad: sql<number>`SUM(${ordenItems.cantidad})::int`,
            total: sql<string>`COALESCE(SUM(${ordenItems.subtotal}), 0)`,
          })
          .from(ordenItems)
          .innerJoin(ordenes, eq(ordenItems.ordenId, ordenes.id))
          .innerJoin(platillos, eq(ordenItems.platilloId, platillos.id))
          .where(
            and(
              gte(ordenes.tiempoApertura, inicio),
              lt(ordenes.tiempoApertura, fin),
              ne(ordenes.estatus, 'cancelada'),
            ),
          )
          .groupBy(platillos.nombre)
          .orderBy(desc(sql`SUM(${ordenItems.cantidad})`))
          .limit(5),
        this.listarIncidencias(),
        this.listarMermasDeHoy(),
        this.db
          .select({
            id: cierresCaja.id,
            fechaApertura: cierresCaja.fechaApertura,
            name: users.name,
            lastname: users.lastname,
          })
          .from(cierresCaja)
          .leftJoin(users, eq(cierresCaja.userId, users.id))
          .where(eq(cierresCaja.estatus, 'abierto')),
      ]);

    return construirResumen({
      pagosHoy,
      ordenesHoy,
      top,
      incidencias,
      mermas,
      cajas,
      periodo: { inicio, fin },
    });
  }
}

type Entrada = {
  pagosHoy: {
    ordenId: string;
    monto: string;
    propina: string | null;
    creadoEn: string | null;
    metodo: string | null;
    tipo: string | null;
    cajeroId: number | null;
    cajeroNombre: string | null;
    cajeroApellido: string | null;
    mesa: string | null;
  }[];
  ordenesHoy: {
    id: string;
    estatus: string | null;
    total: string | null;
    comensales: number | null;
    meseroId: number | null;
    meseroNombre: string | null;
    meseroApellido: string | null;
  }[];
  top: { nombre: string; cantidad: number; total: string }[];
  incidencias: unknown[];
  mermas: { cost: string; productName?: string }[];
  cajas: {
    id: number;
    fechaApertura: string;
    name: string | null;
    lastname: string | null;
  }[];
  periodo?: { inicio: string; fin: string };
};

/** Arma el resumen del día con lo que devuelven las consultas (separado para probarlo sin base). */
export function construirResumen({
  pagosHoy,
  ordenesHoy,
  top,
  incidencias,
  mermas,
  cajas,
  periodo,
}: Entrada) {
  const porMetodo = new Map<
    string,
    { metodo: string; total: number; pagos: number }
  >();
  const porCajero = new Map<
    string,
    { nombre: string; total: number; pagos: number }
  >();
  const porHora = Array.from({ length: 24 }, () => 0);
  const ordenesPagadas = new Set<string>();
  let cobrado = 0;
  let propinas = 0;

  for (const pago of pagosHoy) {
    const monto = centavos(pago.monto);
    cobrado += monto;
    propinas += centavos(pago.propina);
    ordenesPagadas.add(pago.ordenId);
    const metodo = pago.metodo ?? 'Otro';
    const m = porMetodo.get(metodo) ?? { metodo, total: 0, pagos: 0 };
    m.total += monto;
    m.pagos += 1;
    porMetodo.set(metodo, m);
    const quien =
      nombre(pago.cajeroNombre, pago.cajeroApellido) ?? 'Pago en línea';
    const c = porCajero.get(quien) ?? { nombre: quien, total: 0, pagos: 0 };
    c.total += monto;
    c.pagos += 1;
    porCajero.set(quien, c);
    if (pago.creadoEn) porHora[new Date(pago.creadoEn).getHours()] += monto;
  }

  const porMesero = new Map<
    string,
    { nombre: string; pedidos: number; total: number; comensales: number }
  >();
  const estatus: Record<string, number> = {};
  let comensales = 0;
  for (const orden of ordenesHoy) {
    const e = orden.estatus ?? 'abierta';
    estatus[e] = (estatus[e] ?? 0) + 1;
    if (e === 'cancelada') continue;
    comensales += orden.comensales ?? 1;
    const quien =
      nombre(orden.meseroNombre, orden.meseroApellido) ?? 'Sin asignar (web)';
    const w = porMesero.get(quien) ?? {
      nombre: quien,
      pedidos: 0,
      total: 0,
      comensales: 0,
    };
    w.pedidos += 1;
    w.total += centavos(orden.total);
    w.comensales += orden.comensales ?? 1;
    porMesero.set(quien, w);
  }

  const ordenar = <T extends { total: number }>(items: Iterable<T>) =>
    [...items].sort((a, b) => b.total - a.total);

  // «Ver cálculo» (Prioridad 1.4): cada cifra con los pagos u órdenes que la producen.
  const filtrosPagos = { 'estatus del pago': 'completado' };
  const clavePago = (p: Entrada['pagosHoy'][number], i: number) =>
    `Pago ${i + 1}${p.mesa ? ` · mesa ${p.mesa}` : ' · en línea'}${p.creadoEn ? ` · ${p.creadoEn.slice(11, 16)}` : ''}`;
  const noCanceladas = ordenesHoy.filter((o) => o.estatus !== 'cancelada');
  const calculos: Record<string, Calculo> = {
    cobrado: {
      formula: 'cobrado = suma del monto de cada pago completado de hoy',
      operacion: 'suma',
      periodo,
      filtros: filtrosPagos,
      datos: pagosHoy.map((p, i) => ({
        clave: clavePago(p, i),
        valor: aPesos(centavos(p.monto)),
        origen: p.metodo ?? undefined,
      })),
    },
    propinas: {
      formula: 'propinas = suma de la propina de cada pago completado de hoy',
      operacion: 'suma',
      periodo,
      filtros: filtrosPagos,
      datos: pagosHoy.map((p, i) => ({
        clave: clavePago(p, i),
        valor: aPesos(centavos(p.propina)),
      })),
    },
    ticketPromedio: {
      formula:
        'ticket medio = cobrado / cuentas pagadas (redondeado al centavo)',
      operacion: 'cociente',
      periodo,
      filtros: filtrosPagos,
      datos: [
        { clave: 'cobrado', valor: aPesos(cobrado) },
        { clave: 'cuentas pagadas', valor: ordenesPagadas.size },
      ],
    },
    mermas: {
      formula: 'costo de mermas = suma del costo de cada merma registrada hoy',
      operacion: 'suma',
      periodo,
      datos: mermas.map((m, i) => ({
        clave: `Merma ${i + 1}${m.productName ? ` · ${m.productName}` : ''}`,
        valor: aPesos(centavos(m.cost)),
      })),
    },
    comensales: {
      formula:
        'comensales = suma de los comensales de cada orden de hoy no cancelada (1 si no se anotó)',
      operacion: 'suma',
      periodo,
      filtros: { 'estatus de la orden': 'distinto de cancelada' },
      datos: noCanceladas.map((o, i) => ({
        clave: `Orden ${i + 1} · ${o.id.slice(0, 6)}`,
        valor: o.comensales ?? 1,
      })),
    },
  };

  return {
    calculos,
    ventas: {
      cobrado: pesos(cobrado),
      propinas: pesos(propinas),
      pagos: pagosHoy.length,
      ordenesPagadas: ordenesPagadas.size,
      ticketPromedio: pesos(
        ordenesPagadas.size ? Math.round(cobrado / ordenesPagadas.size) : 0,
      ),
      comensales,
    },
    pedidos: {
      total: ordenesHoy.length - (estatus.cancelada ?? 0),
      porEstatus: estatus,
    },
    porMetodo: ordenar(porMetodo.values()).map((m) => ({
      ...m,
      total: pesos(m.total),
    })),
    porCajero: ordenar(porCajero.values()).map((c) => ({
      ...c,
      total: pesos(c.total),
    })),
    porMesero: ordenar(porMesero.values()).map((w) => ({
      ...w,
      total: pesos(w.total),
    })),
    porHora: porHora.map((cents) => cents / 100),
    topPlatillos: top.map((t) => ({
      nombre: t.nombre,
      cantidad: Number(t.cantidad),
      total: pesos(centavos(t.total)),
    })),
    ultimosCobros: pagosHoy.slice(0, 8).map((pago) => ({
      ordenId: pago.ordenId,
      mesa: pago.mesa,
      monto: pesos(centavos(pago.monto)),
      propina: pesos(centavos(pago.propina)),
      metodo: pago.metodo,
      cajero: nombre(pago.cajeroNombre, pago.cajeroApellido),
      creadoEn: pago.creadoEn,
    })),
    incidencias,
    mermas: {
      registros: mermas.length,
      costo: pesos(mermas.reduce((sum, m) => sum + centavos(m.cost), 0)),
    },
    cajasAbiertas: cajas.map((c) => ({
      id: c.id,
      cajero: nombre(c.name, c.lastname),
      desde: c.fechaApertura,
    })),
  };
}
