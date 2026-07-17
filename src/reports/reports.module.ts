import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExportController } from './export/export.controller';
import { ExportService } from './export/export.service';
import { ExportSalesDishesRepository } from './export/repositories/export.salesDishes.repository';
import { CsvAdapter } from './export/adapters/csv.adapter';
import { XlsxAdapter } from './export/adapters/xlsx.adapter';
import { PdfAdapter } from './export/adapters/pdf.adapter';
import { SegmentsController } from './segments/segments.controller';
import { SegmentsService } from './segments/segments.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ExportController, SegmentsController],
  providers: [
    ExportService,
    ExportSalesDishesRepository,
    CsvAdapter,
    XlsxAdapter,
    PdfAdapter,
    SegmentsService,
  ],
  exports: [ExportService],
})
export class ReportsModule {}
