import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { ImportType } from './dto/importDTO';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ROLES } from 'src/common/constants/roles';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('excel')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async importExcel(
    @UploadedFile() file: UploadedExcelFile | undefined,
    @Query('type') type?: ImportType,
    @Query('mode') mode?: 'insert' | 'upsert',
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (field: file)');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser .xlsx');
    }

    const importType = type || ImportType.DISHES;
    const importMode = mode || 'insert';

    return await this.importService.importFromExcel(file.buffer, {
      type: importType,
      mode: importMode,
    });
  }

  @Post('platillos/excel')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importPlatillosExcel(
    @UploadedFile() file: UploadedExcelFile | undefined,
    @Query('mode') mode?: 'insert' | 'upsert',
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (field: file)');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser .xlsx');
    }

    return await this.importService.importPlatillos(
      file.buffer,
      mode || 'insert',
    );
  }

  @Post('sales/dishes/excel')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importSalesDishesExcel(
    @UploadedFile() file: UploadedExcelFile | undefined,
    @Query('mode') mode?: 'insert' | 'upsert',
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (field: file)');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser .xlsx');
    }

    return await this.importService.importSalesDishes(
      file.buffer,
      mode || 'insert',
    );
  }

  @Post('sales/day/excel')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importSalesByDayExcel(
    @UploadedFile() file: UploadedExcelFile | undefined,
    @Query('mode') mode?: 'insert' | 'upsert',
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo (field: file)');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('El archivo debe ser .xlsx');
    }

    return await this.importService.importSalesByDay(
      file.buffer,
      mode || 'insert',
    );
  }
}
