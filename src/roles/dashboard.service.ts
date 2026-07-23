import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { ordenes } from '../database/schema/public.schema';
import { eq, and, sql } from 'drizzle-orm';
import { ReservationsService } from '../reservations/reservations.service';

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
          hora: sql<number>`EXTRACT(HOUR FROM ${ordenes.tiempoApertura})`.mapWith(Number),
          total: sql<number>`SUM(${ordenes.total})`.mapWith(Number),
        })
        .from(ordenes)
        .where(
          sql`${ordenes.tiempoApertura} >= ${inicioDia} AND ${ordenes.tiempoApertura} < ${finDia} AND ${ordenes.estatus} NOT IN ('cancelada')`
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${ordenes.tiempoApertura})`)
        .orderBy(sql`EXTRACT(HOUR FROM ${ordenes.tiempoApertura})`);

      const ventas = Array(24).fill(0);
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
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString();

    // Ventas totales del día
    const { totalDia } = await this.getVentasPorHora();

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

    // Pedidos en preparación del día
    const [abiertos] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(ordenes)
      .where(
        and(
          eq(ordenes.estatus, 'abierta'),
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

    return {
      totalVentas: totalDia,
      pedidosPendientes: pendientes?.count ?? 0,
      pedidosEnPreparacion: abiertos?.count ?? 0,
      mesasOcupadas: ocupadas,
      mesasLibres: libres,
      totalMesas,
    };
  } catch (error) {
    console.error('Error en getAdminStats:', error);
    throw new BadRequestException('Error al cargar estadísticas del dashboard');
  }
}
}
