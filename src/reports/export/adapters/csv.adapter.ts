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
        contentType: 'text/csv',
        filename: options.filename,
      };
    }
    const columns = Object.keys(data[0]);
    const csv = stringify(data, { header: true, columns });
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      contentType: 'text/csv',
      filename: options.filename,
    };
  }
}
