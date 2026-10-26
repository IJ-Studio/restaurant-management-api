import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { ExportQueryDto } from './dto/queryDTO';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ROLES } from 'src/common/constants/roles';

@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async export(@Query() query: ExportQueryDto, @Res() res: Response) {
    const { buffer, filename, contentType } =
      await this.exportService.export(query);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
