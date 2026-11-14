import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES } from '../common/constants/roles';
import { SitioDto } from './sitio.dto';
import { SitioService, type Sitio } from './sitio.service';

@ApiTags('sitio')
@Controller('sitio')
export class SitioController {
  constructor(private readonly sitio: SitioService) {}

  /** Público: lo lee la landing, el login y el registro. */
  @Public()
  @Get()
  obtener(): Promise<Sitio> {
    return this.sitio.obtener();
  }

  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  @Put()
  guardar(@Body() dto: SitioDto): Promise<Sitio> {
    return this.sitio.guardar(dto);
  }
}
