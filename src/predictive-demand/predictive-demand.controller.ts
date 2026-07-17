import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PredictiveDemandService } from './predictive-demand.service';

@Controller('inventory/predictive')
@UseGuards(RolesGuard)
@Roles(1) // admin
export class PredictiveDemandController {
  constructor(private readonly predictiveDemandService: PredictiveDemandService) {}

  @Get('ranking')
  async getRanking(@Query('dias') dias?: string) {
    return this.predictiveDemandService.getRanking(dias ? parseInt(dias, 10) : undefined);
  }

  @Get(':platilloId')
  async getPorPlatillo(
    @Param('platilloId', ParseIntPipe) platilloId: number,
    @Query('dias') dias?: string,
  ) {
    return this.predictiveDemandService.getPorPlatillo(
      platilloId,
      dias ? parseInt(dias, 10) : undefined,
    );
  }
}
