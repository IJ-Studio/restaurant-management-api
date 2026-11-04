import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NoShowService } from './no-show.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

/**
 * Predicción de ausencias (no-show). Se desactiva por configuración (Prioridad 3.5) sin borrar el
 * modelo: solo responde si `PREDICCION_NO_SHOW_ACTIVA=true`; si no, ni siquiera se entrena.
 */
export const prediccionActiva = () =>
  process.env.PREDICCION_NO_SHOW_ACTIVA === 'true';

@Controller('reservations')
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
export class NoShowController {
  constructor(private readonly noShowService: NoShowService) {}

  /** La web lo consulta para mostrar u ocultar la columna de riesgo. */
  @Get('no-show-model/estado')
  estado() {
    return { activa: prediccionActiva() };
  }

  @Get('no-show-model/metrics')
  async getMetrics() {
    this.exigirActiva();
    return this.noShowService.getModelMetrics();
  }

  @Get(':id/no-show-risk')
  async getRisk(@Param('id') id: string) {
    this.exigirActiva();
    return this.noShowService.getRiskForReservation(id);
  }

  private exigirActiva() {
    if (!prediccionActiva())
      throw new NotFoundException(
        'La predicción de ausencias está desactivada.',
      );
  }
}
