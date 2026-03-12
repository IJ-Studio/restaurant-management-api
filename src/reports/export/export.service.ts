import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ExportQueryDto, ExportFormat, ExportType } from './dto/queryDTO';
import { ExportSalesDishesRepository } from './repositories/export.salesDishes.repository';

import { CsvAdapter } from './adapters/csv.adapter';
import { XlsxAdapter } from './adapters/xlsx.adapter';
import { PdfAdapter } from './adapters/pdf.adapter';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly salesRepo: ExportSalesDishesRepository,
    private readonly csvAdapter: CsvAdapter,
    private readonly xlsxAdapter: XlsxAdapter,
    private readonly pdfAdapter: PdfAdapter,
  ) {}

  async export(query: ExportQueryDto) {
    const { type, format, startDate, endDate, limit } = query;

    // 1) Obtenemos los datos según el tipo de reporte
    const data =
      type === ExportType.DISHES
        ? await this.salesRepo.getSalesByDish({ startDate, endDate, limit })
        : await this.salesRepo.getSalesByDay({ startDate, endDate, limit });

    // 2) Elegimos adaptador y generamos archivo (Buffer + metadata)
    const adapter = this.getAdapter(format);

    const filename = this.buildFilename(type, format, startDate, endDate);

    return adapter.export(data, { filename });
  }

  private getAdapter(format: ExportFormat) {
    switch (format) {
      case ExportFormat.CSV:
        return this.csvAdapter;
      case ExportFormat.XLSX:
        return this.xlsxAdapter;
      case ExportFormat.PDF:
        return this.pdfAdapter;
      default:
        throw new BadRequestException('Formato de exportación no soportado');
    }
  }

  private buildFilename(type: ExportType, format: ExportFormat, start: string, end: string) {
    // Nombre amigable para descarga
    const base = type === ExportType.DISHES ? 'ventas-platillos' : 'ventas-por-dia';
    return `${base}_${start}_${end}.${format}`;
  }
}
