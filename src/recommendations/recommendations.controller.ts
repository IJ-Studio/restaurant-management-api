import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
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
    @Param('platilloId', ParseIntPipe) platilloId: number,
  ) {
    return this.recommendationsService.getComboSuggestion(platilloId);
  }
}
