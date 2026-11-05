import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import {
  CorregirMovimientoNominaDto,
  CrearMovimientoNominaDto,
} from './dto/movimiento-nomina.dto';
import { PayrollMovimientosService } from './payroll-movimientos.service';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Sumas y restas a la nómina (Prioridad 3.1), solo para el administrador. */
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('payroll/movimientos')
export class PayrollMovimientosController {
  constructor(private readonly servicio: PayrollMovimientosService) {}

  @Get()
  listar(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('empleadoId') empleadoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    if (pagina < 1) throw new BadRequestException('Página no válida.');
    for (const f of [desde, hasta])
      if (f && !FECHA.test(f))
        throw new BadRequestException('Fecha no válida.');
    return this.servicio.listar({ empleadoId, desde, hasta, pagina });
  }

  @Get('resumen')
  resumen(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    if (!FECHA.test(desde ?? '') || !FECHA.test(hasta ?? '') || hasta < desde)
      throw new BadRequestException('Periodo no válido.');
    return this.servicio.resumen(desde, hasta);
  }

  @Post()
  crear(
    @Body(createStrictValidationPipe()) dto: CrearMovimientoNominaDto,
    @ActiveUser() usuario: ActiveUserData,
  ) {
    return this.servicio.crear(dto, Number(usuario.id));
  }

  @Post(':id/corregir')
  corregir(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: CorregirMovimientoNominaDto,
    @ActiveUser() usuario: ActiveUserData,
  ) {
    return this.servicio.corregir(id, dto.justificacion, Number(usuario.id));
  }
}
