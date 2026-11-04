import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/decorators/public.decorator';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { reportesProblemas } from '../database/schema/reportes-problemas.schema';
import { CrearReporteDto } from './reportes-problemas.dto';

/**
 * Reportes de problemas desde la web (D-34). Público (también lo usan los comensales sin
 * sesión), con un límite propio de peticiones y validación estricta; solo guarda lo que dice el DTO.
 */
@Controller('reportes-problemas')
export class ReportesProblemasController {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body(createStrictValidationPipe()) dto: CrearReporteDto,
  ): Promise<{ success: true }> {
    await this.db.insert(reportesProblemas).values({
      tipo: dto.tipo,
      descripcion: dto.descripcion.trim(),
      ruta: dto.ruta,
    });
    return { success: true };
  }
}
