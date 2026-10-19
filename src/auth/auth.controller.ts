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

import { AuthService, type PublicUser } from './auth.service';
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
  getMe(@ActiveUser() user: ActiveUserData) {
    return { user };
  }

  @Public()
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
  ): Promise<{ accessToken: string; user: PublicUser }> {
    return await this.authService.SignIn(signInDto);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @ActiveUser() user: ActiveUserData,
  ): Promise<{ message: string }> {
    await this.authService.signOut(parseInt(user.id));
    return { message: 'Sesión cerrada correctamente' };
  }
}
