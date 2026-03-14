import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PlatillosModule } from '../../platillos/platillos.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportSalesDishesRepository } from './repositories/import.salesDishes.repository';
import { XlsxReaderAdapter } from './adapters/xlsx.reader.adapter';

@Module({
  imports: [DatabaseModule, PlatillosModule],
  controllers: [ImportController],
  providers: [
    ImportService,
    ImportSalesDishesRepository,
    XlsxReaderAdapter,
  ],
  exports: [ImportService],
})
export class ImportModule {}
