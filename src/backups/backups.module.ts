import { Module } from '@nestjs/common';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { GoogleDriveService } from './google-drive.service';

@Module({
  controllers: [BackupsController],
  providers: [BackupsService, GoogleDriveService],
})
export class BackupsModule {}
