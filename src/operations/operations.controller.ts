import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import {
  CloseCashDto,
  CreateIncidentDto,
  CreateWasteDto,
  OpenCashDto,
} from './dto/operations.dto';
import { OperationsService } from './operations.service';

const PERSONAL = [ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA];

/** Operación diaria desde la app móvil: incidencias de cocina, mermas, corte de caja y resumen. */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Roles(...PERSONAL)
  @Post('cocina/incidencias')
  async reportarIncidencia(
    @Body(createStrictValidationPipe()) dto: CreateIncidentDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.operations.reportarIncidencia(dto, Number(user.id));
  }

  @Roles(...PERSONAL)
  @Get('cocina/incidencias')
  async listarIncidencias(@Query('ordenId') ordenId?: string) {
    return await this.operations.listarIncidencias(ordenId || undefined);
  }

  @Roles(ROLES.ADMIN, ROLES.COCINA)
  @Get('inventario/productos')
  async listarProductos() {
    return await this.operations.listarProductos();
  }

  // Solo el personal operativo registra mermas; el admin solo las consulta (Prioridad 1.2).
  @Roles(ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
  @Post('inventario/mermas')
  async registrarMerma(
    @Body(createStrictValidationPipe()) dto: CreateWasteDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.operations.registrarMerma(dto, Number(user.id));
  }

  @Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
  @Get('inventario/mermas')
  async listarMermas() {
    return await this.operations.listarMermasDeHoy();
  }

  @Roles(ROLES.ADMIN, ROLES.CAJERO)
  @Get('caja/actual')
  async cajaActual(@ActiveUser() user: ActiveUserData) {
    return await this.operations.cajaActual(Number(user.id));
  }

  @Roles(ROLES.ADMIN, ROLES.CAJERO)
  @Post('caja/abrir')
  async abrirCaja(
    @Body(createStrictValidationPipe()) dto: OpenCashDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.operations.abrirCaja(Number(user.id), dto);
  }

  @Roles(ROLES.ADMIN, ROLES.CAJERO)
  @Post('caja/cerrar')
  async cerrarCaja(
    @Body(createStrictValidationPipe()) dto: CloseCashDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.operations.cerrarCaja(Number(user.id), dto);
  }

  @Roles(ROLES.ADMIN)
  @Get('caja/cortes')
  async listarCortes() {
    return await this.operations.listarCortes();
  }

  @Roles(ROLES.ADMIN)
  @Get('reportes/hoy')
  async resumenDelDia() {
    return await this.operations.resumenDelDia();
  }
}
