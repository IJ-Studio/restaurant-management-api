import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES } from '../common/constants/roles';
import { FacturasAdminService } from './facturas-admin.service';

const ESTATUS = ['vigente', 'cancelada'];

/** `GET /facturas`: listado del administrador (la consulta por orden sigue en PagosController). */
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('facturas')
export class FacturasAdminController {
  constructor(private readonly servicio: FacturasAdminService) {}

  @Get()
  listar(
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('estatus') estatus?: string,
    @Query('q') busqueda?: string,
  ) {
    if (pagina < 1) throw new BadRequestException('Página no válida.');
    // `?estatus=a&estatus=b` llega como arreglo: solo se acepta un texto.
    if (
      estatus !== undefined &&
      (typeof estatus !== 'string' || !ESTATUS.includes(estatus))
    )
      throw new BadRequestException('Estatus no válido.');
    if (
      busqueda !== undefined &&
      (typeof busqueda !== 'string' || busqueda.length > 100)
    )
      throw new BadRequestException('Búsqueda no válida.');
    return this.servicio.listar({ pagina, estatus, busqueda });
  }
}
