import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createStrictValidationPipe } from '../common/config/validation.config';

import {
  AuthService,
  type PublicUser,
  type SessionTokens,
} from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { Public } from './decorators/public.decorator';
import { ActiveUser } from './decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 👇 AGREGA ESTE ENDPOINT PARA RESPONDERLE AL AUTHPROVIDER
  @Get('me')
  async getMe(
    @ActiveUser() user: ActiveUserData,
  ): Promise<{ user: PublicUser }> {
    return { user: await this.authService.getCurrentUser(parseInt(user.id)) };
  }

  // Frena el sondeo de correos registrados: 10 registros por minuto por IP (además del global).
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('sign-up')
  async signUp(
    @Body(createStrictValidationPipe()) signUpDto: SignUpDto,
  ): Promise<PublicUser> {
    return await this.authService.SignUp(signUpDto);
  }
  // Fuerza bruta: 5 intentos por minuto por IP (además del límite global de 40/min).
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body(createStrictValidationPipe()) signInDto: SignInDto,
  ): Promise<SessionTokens> {
    return await this.authService.SignIn(signInDto);
  }

  // Renueva la sesión sin contraseña; el token de refresco es de un solo uso.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(createStrictValidationPipe()) dto: RefreshTokenDto,
  ): Promise<SessionTokens> {
    return await this.authService.refresh(dto.refreshToken);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @ActiveUser() user: ActiveUserData,
    // La web no manda cuerpo; la app manda su token de refresco para que deje de servir.
    @Body() body?: { refreshToken?: unknown },
  ): Promise<{ message: string }> {
    const refreshToken = body?.refreshToken;
    await this.authService.signOut(
      user,
      typeof refreshToken === 'string' ? refreshToken : undefined,
    );
    return { message: 'Sesión cerrada correctamente' };
  }
}
