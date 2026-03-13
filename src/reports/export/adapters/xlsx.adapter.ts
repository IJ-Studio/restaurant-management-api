import { Injectable } from '@nestjs/common';
import { ExportRow } from '../repositories/export.salesDishes.repository';
import ExcelJS from 'exceljs';

@Injectable()
export class XlsxAdapter {
  private filterOutId(data: ExportRow[]): ExportRow[] {
    return data.map(row => {
      const filtered = { ...row };
      delete filtered.id;
      return filtered;
    });
  }

  async export(
    data: ExportRow[],
    options: { filename: string },
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const filteredData = this.filterOutId(data);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte');

    if (filteredData.length) {
      const columns = Object.keys(filteredData[0]);
      sheet.columns = columns.map((key) => ({ header: key, key }));
      sheet.addRows(filteredData);

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
