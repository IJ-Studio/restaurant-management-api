import { Module } from '@nestjs/common';

import { DeviceTokensService } from './device-tokens.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [DeviceTokensService],
  exports: [DeviceTokensService],
})
export class NotificationsModule {}
