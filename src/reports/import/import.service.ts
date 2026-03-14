import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ImportQueryDto, ImportType } from './dto/importDTO';
import { ImportSalesDishesRepository } from './repositories/import.salesDishes.repository';
import { XlsxReaderAdapter } from './adapters/xlsx.reader.adapter';
import { PlatillosService } from '../../platillos/platillos.service';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly salesRepo: ImportSalesDishesRepository,
    private readonly xlsxReader: XlsxReaderAdapter,
    private readonly platillosService: PlatillosService,
  ) {}

  async importFromExcel(buffer: Buffer, query: ImportQueryDto) {
    const { type, mode = 'insert' } = query;

    // Lee el archivo Excel
    const { headers, rows } = await this.xlsxReader.read(buffer, {
      skipEmptyRows: true,
    });

    this.logger.debug(
      `Excel loaded: ${rows.length} rows, ${headers.length} columns (type: ${type}, mode: ${mode})`,
    );

    if (rows.length === 0) {
      throw new BadRequestException('El archivo Excel no contiene datos válidos');
    }

    // Según el tipo, importa los datos
    if (type === ImportType.DISHES) {
      return await this.platillosService.importExcel(buffer, mode);
    } else if (type === ImportType.SALES_BY_DAY) {
      return await this.salesRepo.importSalesByDay(rows, mode);
    }

    throw new BadRequestException(`Tipo de importación no soportado: ${type}`);
  }

  async importPlatillos(buffer: Buffer, mode: 'insert' | 'upsert' = 'insert') {
    return await this.platillosService.importExcel(buffer, mode);
  }

  async importSalesDishes(
    buffer: Buffer,
    mode: 'insert' | 'upsert' = 'insert',
  ) {
    const { rows } = await this.xlsxReader.read(buffer, {
      skipEmptyRows: true,
    });

    if (rows.length === 0) {
      throw new BadRequestException('El archivo Excel no contiene datos válidos');
    }

    this.logger.debug(`Importing ${rows.length} sales records`);

    return await this.salesRepo.importSalesByDish(rows, mode);
  }

  async importSalesByDay(
    buffer: Buffer,
    mode: 'insert' | 'upsert' = 'insert',
  ) {
    const { rows } = await this.xlsxReader.read(buffer, {
      skipEmptyRows: true,
    });

    if (rows.length === 0) {
      throw new BadRequestException('El archivo Excel no contiene datos válidos');
    }

    this.logger.debug(`Importing ${rows.length} daily sales records`);

    return await this.salesRepo.importSalesByDay(rows, mode);
  }
}
