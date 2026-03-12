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
  export(data: ExportRow[], options: { filename: string }): ExportResult {
    if (!data.length) {
      return {
        buffer: Buffer.from('', 'utf-8'),
        contentType: 'text/csv; charset=utf-8',
        filename: options.filename,
      };
    }

    const columns = Object.keys(data[0]);

    // Serializar correctamente valores numéricos y nulos
    const csv = stringify(data, {
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
