import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { MesaDto } from './mesa.dto';
import { MesasService } from './mesas.service';

@UseGuards(RolesGuard)
@Controller('mesas')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMesas() {
    return await this.mesasService.findAll();
  }

  // ── Administración de mesas (Prioridad 1.3) ─────────────────────────────────

  @Roles(ROLES.ADMIN)
  @Get('admin')
  listar() {
    return this.mesasService.listarAdmin();
  }

  @Roles(ROLES.ADMIN)
  @Get('admin/areas')
  areas() {
    return this.mesasService.areas();
  }

  @Roles(ROLES.ADMIN)
  @Post('admin')
  crear(@Body(createStrictValidationPipe()) dto: MesaDto) {
    return this.mesasService.crear(dto);
  }

  @Roles(ROLES.ADMIN)
  @Patch('admin/:id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body(createStrictValidationPipe()) dto: MesaDto,
  ) {
    return this.mesasService.actualizar(id, dto);
  }

  /** Con historial o reservas activas se desactiva; si no, se archiva y se borra. */
  @Roles(ROLES.ADMIN)
  @Delete('admin/:id')
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser() usuario: ActiveUserData,
    @Query('motivo') motivo?: string,
  ) {
    return this.mesasService.eliminar(id, {
      motivo,
      autorId: Number(usuario.id),
    });
  }
}
