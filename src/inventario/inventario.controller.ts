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
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import {
  AjusteExistenciasDto,
  OrdenCompraDto,
  ProductoDto,
  ProveedorDto,
} from './inventario.dto';
import { InventarioService } from './inventario.service';

/**
 * Inventario del administrador: productos, ajuste de existencias, proveedores, órdenes de compra e
 * historial de mermas. Sustituye a las rutas internas `/api/inventory/*` de la web. Las rutas que ya
 * usa la móvil (`GET /inventario/productos`, `/inventario/mermas`) no cambian.
 */
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('inventario/admin')
export class InventarioController {
  constructor(private readonly servicio: InventarioService) {}

  @Get('productos')
  productos() {
    return this.servicio.productos();
  }

  @Post('productos')
  crearProducto(@Body(createStrictValidationPipe()) dto: ProductoDto) {
    return this.servicio.crearProducto(dto);
  }

  @Patch('productos/:id')
  actualizarProducto(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: ProductoDto,
  ) {
    return this.servicio.actualizarProducto(id, dto);
  }

  @Post('productos/:id/ajuste')
  ajustar(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: AjusteExistenciasDto,
  ) {
    return this.servicio.ajustarExistencias(id, dto.stock);
  }

  @Delete('productos/:id')
  eliminarProducto(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    return this.servicio.eliminar('inventario_productos', id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }

  @Get('proveedores')
  proveedores() {
    return this.servicio.proveedores();
  }

  @Post('proveedores')
  crearProveedor(@Body(createStrictValidationPipe()) dto: ProveedorDto) {
    return this.servicio.crearProveedor(dto);
  }

  @Patch('proveedores/:id')
  actualizarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: ProveedorDto,
  ) {
    return this.servicio.actualizarProveedor(id, dto);
  }

  @Delete('proveedores/:id')
  eliminarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    return this.servicio.eliminar('inventario_proveedores', id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }

  @Get('ordenes')
  ordenes() {
    return this.servicio.ordenes();
  }

  @Post('ordenes')
  crearOrden(@Body(createStrictValidationPipe()) dto: OrdenCompraDto) {
    return this.servicio.crearOrden(dto);
  }

  @Patch('ordenes/:id')
  actualizarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: OrdenCompraDto,
  ) {
    return this.servicio.actualizarOrden(id, dto);
  }

  @Delete('ordenes/:id')
  eliminarOrden(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    return this.servicio.eliminar('inventario_ordenes', id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }

  @Get('mermas')
  mermas() {
    return this.servicio.mermas();
  }
}
