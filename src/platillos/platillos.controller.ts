import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PlatillosService } from './platillos.service';
import { ExportService } from '../reports/export/export.service';
import { ExportFormat, ExportType } from '../reports/export/dto/queryDTO';

type UploadedCsvFile = {
  originalname: string;
  buffer: Buffer;
};

@Controller('platillos')
export class PlatillosController {
  constructor(
    private readonly platillosService: PlatillosService,
    private readonly exportService: ExportService,
  ) {}

  @Get('template.json')
  async downloadTemplateJson(@Res() res: Response) {
    const { filename, json } =
      await this.platillosService.buildImportTemplateJson();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(json);
  }

  @Get('template.csv')
  async downloadTemplate(@Res() res: Response) {
    const { filename, csv } = await this.platillosService.buildImportTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get('export.csv')
  async exportCsv(@Res() res: Response) {
    const { filename, csv } = await this.platillosService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get('export.json')
  async exportJson(@Res() res: Response) {
    const { filename, json } = await this.platillosService.exportJson();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(json);
  }

  @Get('export/excel')
  async exportExcel(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.exportService.export({
      ...query,
      format: ExportFormat.XLSX,
      type: ExportType.DISHES,
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('schema')
  async schema() {
    return this.platillosService.getSchema();
  }

  @Post('import.csv')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importCsv(
    @UploadedFile() file: UploadedCsvFile | undefined,
    @Query('mode') mode?: 'insert' | 'upsert',
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (field: file)');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('El archivo debe ser .csv');
    }

    const text = file.buffer.toString('utf-8');
    return this.platillosService.importCsv(text, mode ?? 'insert');
  }

  @Post('import.json')
  async importJson(
    @Body() body: unknown,
    @Query('mode') mode?: 'insert' | 'upsert',
  ) {
    return this.platillosService.importJson(body, mode ?? 'insert');
  }
}
