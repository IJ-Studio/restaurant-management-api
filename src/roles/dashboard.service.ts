import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { ordenes } from '../database/schema/public.schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { ReservationsService } from '../reservations/reservations.service';
import type { Calculo } from '../common/calculo';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly reservationsService: ReservationsService,
  ) {}

  async getVentasPorHora() {
    const hoy = new Date();
    const inicioDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
    ).toISOString();
    const finDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() + 1,
    ).toISOString();

    try {
      const rows = await this.db
        .select({
          hora: sql<number>`EXTRACT(HOUR FROM ${ordenes.tiempoApertura})`.mapWith(
            Number,
          ),
          total: sql<number>`SUM(${ordenes.total})`.mapWith(Number),
        })
        .from(ordenes)
        .where(
          sql`${ordenes.tiempoApertura} >= ${inicioDia} AND ${ordenes.tiempoApertura} < ${finDia} AND ${ordenes.estatus} NOT IN ('cancelada')`,
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${ordenes.tiempoApertura})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${ordenes.tiempoApertura})`);

      const ventas: number[] = Array<number>(24).fill(0);
      for (const row of rows) {
        ventas[row.hora] = Number(row.total);
      }

      return {
        ventas,
        totalDia: ventas.reduce((a, b) => a + b, 0),
      };
    } catch (error: any) {
      console.error('Error al obtener ventas por hora:', error);
      throw new BadRequestException('Error al cargar las ventas por hora.');
    }
  }

  async getAdminStats() {
    try {
      // Fechas límite del día actual (formato ISO)
      const hoy = new Date();
      const inicioDia = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate(),
      ).toISOString();
      const finDia = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate() + 1,
      ).toISOString();

      // Ventas totales del día
      const { ventas, totalDia } = await this.getVentasPorHora();

      // Pedidos pendientes del día
      const [pendientes] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(ordenes)
        .where(
          and(
            eq(ordenes.estatus, 'pendiente'),
            sql`${ordenes.tiempoApertura} >= ${inicioDia}`,
            sql`${ordenes.tiempoApertura} < ${finDia}`,
          ),
        );

      // Pedidos en cocina del día (enviados o en preparación)
      const [abiertos] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(ordenes)
        .where(
          and(
            inArray(ordenes.estatus, ['abierta', 'en_preparacion']),
            sql`${ordenes.tiempoApertura} >= ${inicioDia}`,
            sql`${ordenes.tiempoApertura} < ${finDia}`,
          ),
        );

      // Listos para entregar y entregados por cobrar (app móvil)
      const [listos] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(ordenes)
        .where(
          and(
            eq(ordenes.estatus, 'lista'),
            sql`${ordenes.tiempoApertura} >= ${inicioDia}`,
            sql`${ordenes.tiempoApertura} < ${finDia}`,
          ),
        );
      const [porCobrar] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(ordenes)
        .where(
          and(
            eq(ordenes.estatus, 'entregada'),
            sql`${ordenes.tiempoApertura} >= ${inicioDia}`,
            sql`${ordenes.tiempoApertura} < ${finDia}`,
          ),
        );

      // Mesas ocupadas (instantáneo, no necesita fecha)
      const nowISO = new Date().toISOString();
      const mapaMesas = await this.reservationsService.getTableMap(nowISO);
      const totalMesas = mapaMesas.length;
      const ocupadas = mapaMesas.filter((m) => m.estado === 'ocupada').length;
      const libres = totalMesas - ocupadas;

      // «Ver cálculo» (Prioridad 1.4): de las mismas filas que dan cada cifra.
      const periodo = { inicio: inicioDia, fin: finDia };
      const cuenta = (nombre: string, estatus: string, n = 0): Calculo => ({
        formula: `${nombre} = órdenes de hoy con estatus ${estatus}`,
        operacion: 'suma',
        periodo,
        filtros: { 'estatus de la orden': estatus },
        datos: [{ clave: estatus, valor: n }],
      });
      const calculos: Record<string, Calculo> = {
        totalVentas: {
          formula: 'ventas de hoy = suma del total de las órdenes de cada hora',
          operacion: 'suma',
          periodo,
          filtros: { 'estatus de la orden': 'distinto de cancelada' },
          datos: ventas
            .map((total: number, hora: number) => ({
              clave: `${String(hora).padStart(2, '0')}:00 a ${String(hora).padStart(2, '0')}:59`,
              valor: total,
            }))
            .filter((d: { valor: number }) => d.valor !== 0),
        },
        pedidosPendientes: cuenta(
          'pedidos pendientes',
          'pendiente',
          pendientes?.count,
        ),
        pedidosEnPreparacion: cuenta(
          'en cocina',
          'abierta o en_preparacion',
          abiertos?.count,
        ),
        pedidosListos: cuenta('listos para servir', 'lista', listos?.count),
        pedidosPorCobrar: cuenta('por cobrar', 'entregada', porCobrar?.count),
        mesasOcupadas: {
          formula:
            'mesas ocupadas = mesas activas con una reservación en las próximas dos horas',
          operacion: 'conteo',
          periodo: {
            inicio: nowISO,
            fin: new Date(Date.parse(nowISO) + 120 * 60000).toISOString(),
          },
          filtros: {
            'estatus de la reservación': 'distinto de cancelada y completada',
          },
          datos: mapaMesas
            .filter((m) => m.estado === 'ocupada')
            .map((m) => ({ clave: `Mesa ${m.numero}`, valor: 'ocupada' })),
        },
      };

      return {
        calculos,
        totalVentas: totalDia,
        pedidosPendientes: pendientes?.count ?? 0,
        pedidosEnPreparacion: abiertos?.count ?? 0,
        pedidosListos: listos?.count ?? 0,
        pedidosPorCobrar: porCobrar?.count ?? 0,
        mesasOcupadas: ocupadas,
        mesasLibres: libres,
        totalMesas,
      };
    } catch (error) {
      console.error('Error en getAdminStats:', error);
      throw new BadRequestException(
        'Error al cargar estadísticas del dashboard',
      );
    }
  }
}
