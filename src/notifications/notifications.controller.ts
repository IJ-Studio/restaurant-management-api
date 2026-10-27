import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { DeviceTokensService } from './device-tokens.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

/** Las notificaciones push son para el personal (HU-07); los clientes no registran dispositivos. */
@Controller('notifications/devices')
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
export class NotificationsController {
  constructor(private readonly deviceTokens: DeviceTokensService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(
    @Body(createStrictValidationPipe()) dto: RegisterDeviceDto,
    @ActiveUser() user: ActiveUserData,
  ): Promise<void> {
    await this.deviceTokens.register(Number(user.id), dto);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(
    @Param('token') token: string,
    @ActiveUser() user: ActiveUserData,
  ): Promise<void> {
    await this.deviceTokens.unregister(Number(user.id), token);
  }
}
