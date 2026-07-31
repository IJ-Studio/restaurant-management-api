import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';
import { SegmentsService } from './segments.service';

@Controller('reports')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get('customer-segments')
  @UseGuards(RolesGuard)
  @Roles(ROLES.ADMIN)
  async getCustomerSegments() {
    return this.segmentsService.getCustomerSegments();
  }
}
