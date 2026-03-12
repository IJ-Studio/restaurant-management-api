import { Injectable } from '@nestjs/common';
import { ExportRow } from '../repositories/export.salesDishes.repository';
import ExcelJS from 'exceljs';

@Injectable()
export class XlsxAdapter {
  async export(data: ExportRow[], options: { filename: string }) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');

    if (data.length) {
      sheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
      sheet.addRows(data);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: options.filename,
    };
  }
}
