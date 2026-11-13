import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ImportarCartaService } from './importar-carta.service';
import { PlatillosService } from './platillos.service';
import { ExportService } from '../reports/export/export.service';
import { ExportFormat, ExportType } from '../reports/export/dto/queryDTO';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ROLES } from 'src/common/constants/roles';
import { ActiveUser } from 'src/auth/decorators/active-user.decorator';
import type { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';
import { createStrictValidationPipe } from 'src/common/config/validation.config';
import { ActualizarPlatilloDto, CrearPlatilloDto } from './dto/platillo.dto';

type UploadedCsvFile = {
  originalname: string;
  buffer: Buffer;
};

@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('platillos')
export class PlatillosController {
  constructor(
    private readonly platillosService: PlatillosService,
    private readonly exportService: ExportService,
    private readonly importacion: ImportarCartaService,
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

  @Get('export/dishes/excel')
  async exportExcel(@Query() query: any, @Res() res: Response) {
    const platillos = await this.platillosService.getAllPlatillos();

    const { buffer, filename, contentType } =
      await this.exportService.exportPlatillos(platillos);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('export/sales/excel')
  async exportSalesExcel(@Query() query: any, @Res() res: Response) {
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

  /** Plantilla de importación de la carta (Fase 4.2). */
  @Get('plantilla.csv')
  plantilla(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-carta.csv"',
    );
    // BOM: Excel abre bien los acentos.
    res.send(`\uFEFF${this.importacion.plantillaCsv()}`);
  }

  /**
   * Importa la carta desde Excel o CSV con la plantilla en español. `confirmar=false` devuelve la
   * vista previa; `modo=reemplazar` deshabilita (no borra) lo que no venga; `forzar=true` es
   * «Importar de todas formas» (omite las filas con error).
   */
  @Post('importar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  importarCarta(
    @UploadedFile() file: UploadedCsvFile | undefined,
    @Query('modo') modo = 'agregar',
    @Query('confirmar') confirmar = 'false',
    @Query('forzar') forzar = 'false',
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo file).');
    if (modo !== 'agregar' && modo !== 'reemplazar') {
      throw new BadRequestException('El modo debe ser agregar o reemplazar.');
    }
    return this.importacion.importar(
      file,
      modo,
      confirmar === 'true',
      forzar === 'true',
    );
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

  // ── Alta, edición y borrado desde la carta del admin (D-31) ──
  @Post()
  crear(@Body(createStrictValidationPipe()) dto: CrearPlatilloDto) {
    return this.platillosService.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: ActualizarPlatilloDto,
  ) {
    return this.platillosService.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    return this.platillosService.eliminar(id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }
}
