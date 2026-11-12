import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BackupsService } from './backups.service';
import type { Response } from 'express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ROLES } from 'src/common/constants/roles';

@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  getAll() {
    return this.backupsService.getBackups();
  }

  @Post()
  create(@Body() body: { type?: 'manual' | 'auto' }) {
    const type = body?.type === 'auto' ? 'auto' : 'manual';
    return this.backupsService.createBackup(type);
  }

  // @Get(':id/download')
  // async download(@Param('id') id: string, @Res() res: Response) {
  //   const { buffer, name } = await this.backupsService.downloadBackup(+id);
  //   res.set({
  //     'Content-Type': 'application/json',
  //     'Content-Disposition': `attachment; filename="${name}.json"`,
  //   });
  //   res.send(buffer);
  // }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.backupsService.deleteBackup(+id);
  }
}
