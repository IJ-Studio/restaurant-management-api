import {
  BadRequestException,
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
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { TABLAS_ARCHIVABLES, type TablaArchivable } from './archivar';
import { RegistrosEliminadosService } from './registros-eliminados.service';

/** Bajas del API: consulta y restauración, solo para el administrador. */
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('registros-eliminados')
export class RegistrosEliminadosController {
  constructor(private readonly servicio: RegistrosEliminadosService) {}

  @Get()
  listar(
    @Query('tabla') tabla: string | undefined,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
  ) {
    if (tabla && !TABLAS_ARCHIVABLES.includes(tabla as TablaArchivable))
      throw new BadRequestException('Tabla no válida.');
    if (pagina < 1) throw new BadRequestException('Página no válida.');
    return this.servicio.listar(tabla as TablaArchivable | undefined, pagina);
  }

  @Post(':id/restaurar')
  restaurar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
  ) {
    return this.servicio.restaurar(id, Number(usuario.id));
  }
}
