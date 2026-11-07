import { Module } from '@nestjs/common';

import { DeviceTokensService } from './device-tokens.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [DeviceTokensService, NotificationsService],
  exports: [DeviceTokensService, NotificationsService],
})
export class NotificationsModule {}
