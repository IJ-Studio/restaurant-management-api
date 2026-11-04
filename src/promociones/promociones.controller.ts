import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { ActualizarPromocionDto, CrearPromocionDto } from './promociones.dto';
import { PromocionesService } from './promociones.service';

/** Promociones: lectura pública de las vigentes y administración solo para el admin. */
@Controller('promociones')
export class PromocionesController {
  constructor(private readonly servicio: PromocionesService) {}

  @Public()
  @Get()
  vigentes() {
    return this.servicio.vigentes();
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get('admin')
  todas() {
    return this.servicio.todas();
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Post()
  crear(@Body(createStrictValidationPipe()) dto: CrearPromocionDto) {
    return this.servicio.crear(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: ActualizarPromocionDto,
  ) {
    return this.servicio.actualizar(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Delete(':id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    return this.servicio.eliminar(id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }
}
