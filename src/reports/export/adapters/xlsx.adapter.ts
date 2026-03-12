import { Injectable } from '@nestjs/common';
import { ExportRow } from '../repositories/export.salesDishes.repository';
import ExcelJS from 'exceljs';

@Injectable()
export class XlsxAdapter {
  async export(
    data: ExportRow[],
    options: { filename: string },
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');

    if (data.length) {
      const columns = Object.keys(data[0]);
      sheet.columns = columns.map((key) => ({ header: key, key }));
      sheet.addRows(data);

      // Auto-ajustar ancho de columnas
      columns.forEach((col) => {
        const column = sheet.getColumn(col);
        column.width = 20;
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer as ArrayBuffer),
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: options.filename,
    };
  }
}
