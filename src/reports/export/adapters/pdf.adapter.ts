import { Injectable } from '@nestjs/common';
import { ExportRow } from '../repositories/export.salesDishes.repository';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfAdapter {
  export(data: ExportRow[], options: { filename: string }) {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {});

    // Encabezado simple
    doc.fontSize(14).text(`Reporte ${options.filename}`, { align: 'center' });
    doc.moveDown();

    if (!data.length) {
      doc.fontSize(12).text('No hay datos para mostrar');
      doc.end();
      const buffer = Buffer.concat(chunks);
      return { buffer, contentType: 'application/pdf', filename: options.filename };
    }

    // Tabla simple: filas y columnas
    const columns = Object.keys(data[0]);
    const rowHeight = 20;

    // encabezados
    columns.forEach((col, idx) => {
      doc.text(col, 30 + idx * 120, doc.y, { width: 120, continued: idx < columns.length - 1 });
    });
    doc.moveDown();

    // filas
    data.forEach(row => {
      columns.forEach((col, idx) => {
        doc.text(String(row[col] ?? ''), 30 + idx * 120, doc.y, {
          width: 120,
          continued: idx < columns.length - 1,
        });
      });
      doc.moveDown();
    });

    doc.end();
    const buffer = Buffer.concat(chunks);
    return { buffer, contentType: 'application/pdf', filename: options.filename };
  }
}
