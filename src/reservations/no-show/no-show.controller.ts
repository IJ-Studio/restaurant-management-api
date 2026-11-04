import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { NoShowService } from './no-show.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

@Controller('reservations')
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
export class NoShowController {
  constructor(private readonly noShowService: NoShowService) {}

  @Get('no-show-model/metrics')
  async getMetrics() {
    return this.noShowService.getModelMetrics();
  }

  @Get(':id/no-show-risk')
  async getRisk(@Param('id') id: string) {
    return this.noShowService.getRiskForReservation(id);
  }
}
