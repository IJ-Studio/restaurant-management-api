import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import type { EstatusSolicitudFactura } from '../database/schema/solicitudes-factura.schema';
import { CrearFacturaDto } from '../pagos/dto/pagos.dto';
import { SolicitudesFacturaService } from './solicitudes-factura.service';

const ESTATUS: EstatusSolicitudFactura[] = [
  'pendiente',
  'emitida',
  'rechazada',
];

@ApiTags('solicitudes-factura')
@Controller('solicitudes-factura')
export class SolicitudesFacturaController {
  constructor(private readonly servicio: SolicitudesFacturaService) {}

  /** El cliente pide su factura (al pagar o después). */
  @Post()
  solicitar(
    @Body(createStrictValidationPipe()) dto: CrearFacturaDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.servicio.solicitar(dto, Number(user.id));
  }

  @Get('orden/:ordenId')
  deOrden(
    @Param('ordenId', ParseUUIDPipe) ordenId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.servicio.deOrden(ordenId, Number(user.id));
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get()
  listar(@Query('estatus') estatus = 'pendiente') {
    if (!ESTATUS.includes(estatus as EstatusSolicitudFactura)) {
      throw new BadRequestException('Estatus no válido.');
    }
    return this.servicio.listar(estatus as EstatusSolicitudFactura);
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Post(':id/emitir')
  emitir(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.servicio.emitir(id, Number(user.id));
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Post(':id/rechazar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.servicio.rechazar(id, motivo, Number(user.id));
  }
}
