import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ActiveUser } from '../auth/decorators/active-user.decorator';
import type { PublicUser } from '../auth/auth.service';
import { createStrictValidationPipe } from '../common/config/validation.config';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { DeleteAccountDto, UpdatePrivacyDto } from './dto/privacy.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrivacyService, type PrivacyState } from './privacy.service';
import { UsersService } from './users.service';

/**
 * Derechos ARCO sobre la cuenta propia: Acceso (`GET /profile`), Rectificación (`PUT /profile`),
 * Cancelación (`DELETE /account`) y Oposición (`PUT /profile/privacidad`). El usuario sale siempre
 * del token: nadie puede leer, editar ni borrar la cuenta de otra persona por estas rutas.
 */
@ApiTags('profile')
@Controller()
export class ProfileController {
  constructor(
    private readonly usersService: UsersService,
    private readonly privacyService: PrivacyService,
  ) {}

  @Get('profile')
  getProfile(@ActiveUser() user: ActiveUserData): Promise<PublicUser> {
    const id = parseInt(user.id);
    return this.usersService.getPublicUserById(id, id);
  }

  @Put('profile')
  updateProfile(
    @ActiveUser() user: ActiveUserData,
    @Body(createStrictValidationPipe()) dto: UpdateUserDto,
  ) {
    const id = parseInt(user.id);
    return this.usersService.updateUser(id, dto, id);
  }

  @Get('profile/privacidad')
  getPrivacy(@ActiveUser() user: ActiveUserData): Promise<PrivacyState> {
    return this.privacyService.getState(parseInt(user.id));
  }

  @Put('profile/privacidad')
  updatePrivacy(
    @ActiveUser() user: ActiveUserData,
    @Body(createStrictValidationPipe()) dto: UpdatePrivacyDto,
  ): Promise<PrivacyState> {
    return this.privacyService.update(parseInt(user.id), dto);
  }

  // Misma protección que el login: la contraseña viaja en el cuerpo y no debe poder adivinarse aquí.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Delete(['profile', 'account'])
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @ActiveUser() user: ActiveUserData,
    @Body(createStrictValidationPipe()) dto: DeleteAccountDto,
  ): Promise<void> {
    await this.privacyService.deleteOwnAccount(parseInt(user.id), dto.password);
  }
}
