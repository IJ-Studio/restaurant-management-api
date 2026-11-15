import { Controller, Get, Param } from '@nestjs/common';
import { IdPositivoPipe } from '../common/pipes/id-positivo.pipe';
import { Public } from '../auth/decorators/public.decorator';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Public()
  @Get('combo/:platilloId')
  async getComboSuggestion(
    @Param('platilloId', new IdPositivoPipe('El platillo no es válido.'))
    platilloId: number,
  ) {
    return this.recommendationsService.getComboSuggestion(platilloId);
  }
}
