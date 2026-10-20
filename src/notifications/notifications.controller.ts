import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES } from '../common/constants/roles';
import { createStrictValidationPipe } from '../common/config/validation.config';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

import {
  RegisterDeviceDto,
  UnregisterDeviceDto,
} from './dto/register-device.dto';
import { NotificationsService } from './notifications.service';

// El usuario sale SIEMPRE del JWT, nunca del body: nadie puede registrar ni borrar tokens ajenos.
@ApiTags('notificaciones')
@Controller('notificaciones')
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('dispositivos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(
    @ActiveUser() user: ActiveUserData,
    @Body(createStrictValidationPipe()) dto: RegisterDeviceDto,
  ): Promise<void> {
    await this.notifications.registerDevice(Number(user.id), dto);
  }

  @Delete('dispositivos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async unregister(
    @ActiveUser() user: ActiveUserData,
    @Body(createStrictValidationPipe()) dto: UnregisterDeviceDto,
  ): Promise<void> {
    await this.notifications.unregisterDevice(Number(user.id), dto.token);
  }
}
