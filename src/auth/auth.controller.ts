import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { Public } from './decorators/public.decorator';
import { ActiveUser } from './decorators/active-user.decorator';
import { InferSelectModel } from 'drizzle-orm';
import { users } from './../database/schema/public.schema';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

type User = InferSelectModel<typeof users>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto): Promise<User> {
    return await this.authService.SignUp(signUpDto);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto): Promise<{ accessToken: string; user: User }> {
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
