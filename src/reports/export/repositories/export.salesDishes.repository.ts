import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../database/supabase.service';

export type ExportRow = Record<string, any>;

@Injectable()
export class ExportSalesDishesRepository {
  constructor(private readonly db: SupabaseService) {}

  async getSalesByDish(params: {
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<ExportRow[]> {
    const { startDate, endDate, limit } = params; // ← desestructurar todo

    const { data, error } = await this.db
      .getClient()
      .from('v_ventas_platillo')
      .select('*')
      .order('veces_ordenado', { ascending: false })
      .limit(limit ?? 100);

    if (error) throw error;
    return (data ?? []) as ExportRow[];
  }

  async getSalesByDay(params: {
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<ExportRow[]> {
    const { startDate, endDate, limit } = params;

    const query = this.db
      .getClient()
      .from('v_ventas_por_dia')
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .order('fecha', { ascending: true });

    if (limit) query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ExportRow[];
  }
}
