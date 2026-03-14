import { Injectable } from '@nestjs/common';
import { ExportRow } from '../repositories/export.salesDishes.repository';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfAdapter {
  private filterOutId(data: ExportRow[]): ExportRow[] {
    return data.map(row => {
      const filtered = { ...row };
      delete filtered.id;
      return filtered;
    });
  }

  export(
    data: ExportRow[],
    options: { filename: string },
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    return new Promise((resolve, reject) => {
      const filteredData = this.filterOutId(data);

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      // Capturar datos del stream
      doc.on('data', (chunk) => chunks.push(chunk));

      // Cuando el documento termina, resolver con el buffer completo
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          contentType: 'application/pdf',
          filename: options.filename,
        });
      });

      // Capturar errores
      doc.on('error', reject);

      // ============ Encabezado ============
      doc.fontSize(16).font('Helvetica-Bold')
        .text(`Reporte: ${options.filename}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(10).font('Helvetica')
        .text(`Generado: ${new Date().toLocaleString('es-MX')}`, { align: 'center' });
      doc.moveDown(2);

      if (!filteredData.length) {
        doc.fontSize(12).text('No hay datos para mostrar.');
        doc.end();
        return;
      }

      // ============ Tabla ============
      const columns = Object.keys(filteredData[0]);
      const colWidth = Math.min(100, (doc.page.width - 80) / columns.length);

      // Header de tabla
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
      columns.forEach((col, idx) => {
        doc.text(col.toUpperCase(), 40 + idx * colWidth, doc.y, {
          width: colWidth,
          continued: idx < columns.length - 1,
        });
      });
      doc.moveDown(0.5);

      // Línea separadora
      doc.moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // Filas de datos
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      filteredData.forEach((row, rowIdx) => {
        // Si nos quedamos sin espacio, agregar nueva página
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
          // Repetir header en nueva página
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000');
          columns.forEach((col, idx) => {
            doc.text(col.toUpperCase(), 40 + idx * colWidth, doc.y, {
              width: colWidth,
              continued: idx < columns.length - 1,
            });
          });
          doc.moveDown(0.5);
          doc.moveTo(40, doc.y)
            .lineTo(doc.page.width - 40, doc.y)
            .stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(8).fillColor('#333333');
        }

        const rowY = doc.y;
        columns.forEach((col, idx) => {
          doc.text(
            String(row[col] ?? ''),
            40 + idx * colWidth,
            rowY,
            { width: colWidth, continued: idx < columns.length - 1 },
          );
        });
        doc.moveDown(0.5);
      });

      // Finalizar documento (esto triggers el evento 'end')
      doc.end();
    });
  }
}
