import { Injectable } from '@nestjs/common';
import { ExportRow } from '../repositories/export.salesDishes.repository';
import { stringify } from 'csv-stringify/sync';

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

@Injectable()
export class CsvAdapter {
  private filterOutId(data: ExportRow[]): ExportRow[] {
    return data.map(row => {
      const filtered = { ...row };
      delete filtered.id;
      return filtered;
    });
  }

  export(data: ExportRow[], options: { filename: string }): ExportResult {
    const filteredData = this.filterOutId(data);

    if (!filteredData.length) {
      return {
        buffer: Buffer.from('', 'utf-8'),
        contentType: 'text/csv; charset=utf-8',
        filename: options.filename,
      };
    }

    const columns = Object.keys(filteredData[0]);

    // Serializar correctamente valores numéricos y nulos
    const csv = stringify(filteredData, {
      header: true,
      columns,
      cast: {
        object: (value) => (value === null ? '' : String(value)),
      },
    });

    // Agregar BOM para que Excel abra bien con caracteres especiales
    return {
      buffer: Buffer.from('\uFEFF' + csv, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      filename: options.filename,
    };
  }
}
