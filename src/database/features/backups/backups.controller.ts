import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { BackupsService } from './backups.service';

@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  getAll() {
    return this.backupsService.getBackups();
  }

  @Post()
  create() {
    return this.backupsService.createBackup('manual');
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.backupsService.deleteBackup(+id);
  }
}
