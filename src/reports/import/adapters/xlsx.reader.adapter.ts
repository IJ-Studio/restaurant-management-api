import { Injectable, BadRequestException } from '@nestjs/common';

export interface ExcelReaderOptions {
  skipEmptyRows?: boolean;
}

export interface ExcelReadResult {
  headers: string[];
  rows: Array<Record<string, any>>;
  rowCount: number;
}

@Injectable()
export class XlsxReaderAdapter {
  async read(
    buffer: Buffer,
    options: ExcelReaderOptions = {},
  ): Promise<ExcelReadResult> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(buffer);
    } catch (error) {
      throw new BadRequestException('Archivo Excel inválido o corrupto');
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('El archivo Excel está vacío');
    }

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell((cell: any) => {
      if (cell.value) {
        headers.push(String(cell.value).trim());
      }
    });

    if (headers.length === 0) {
      throw new BadRequestException('El Excel no tiene encabezados');
    }

    const rows: Array<Record<string, any>> = [];
    let rowCount = 0;

    sheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip header

      const record: Record<string, any> = {};
      let hasContent = false;

      headers.forEach((header, colIndex) => {
        const cellValue = row.getCell(colIndex + 1).value;

        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          hasContent = true;
          record[header] = cellValue;
        } else {
          record[header] = null;
        }
      });

      // Si skipEmptyRows está activado, omitir filas vacías
      if (!options.skipEmptyRows || hasContent) {
        rows.push(record);
        rowCount++;
      }
    });

    if (rowCount === 0) {
      throw new BadRequestException('El Excel no contiene datos válidos');
    }

    return {
      headers,
      rows,
      rowCount,
    };
  }
}
