import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SegmentsService } from './segments.service';

@Controller('reports')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get('customer-segments')
  @UseGuards(RolesGuard)
  @Roles(1) // admin
  async getCustomerSegments() {
    return this.segmentsService.getCustomerSegments();
  }
}
