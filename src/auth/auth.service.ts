import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InferSelectModel, eq } from 'drizzle-orm';

import { DRIZZLE } from './../database/constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './../database/schema/public.schema';
import { users } from './../database/schema/public.schema';

import { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../common/config/jwt.config';
import { CacheService } from 'src/cache/cache.service';
// import { RedisService } from '../redis/redis.service';

import { BcryptService } from './bcrypt.service';
import { randomUUID } from 'crypto';

import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

type User = InferSelectModel<typeof users>;

const ROLE_ADMIN = 1;
const ROLE_USER = 3;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<typeof schema>,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
  ) {}

  async SignUp(signUpDto: SignUpDto): Promise<User> {
    const { name, lastname, phone, email, password } = signUpDto;

    if (password !== signUpDto.passwordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    try {
      const user = await this.db
        .insert(users)
        .values({
          name,
          lastname,
          phone,
          email,
          password: await this.bcryptService.hash(password),
          verified: false,
          loginAttempts: 0,
          roleId: ROLE_USER,
        })
        .returning();

      return user[0];
    } catch (error) {
      throw new BadRequestException(
        'Error al crear el usuario. El email ya existe.',
      );
    }
  }

  async SignIn(
    signInDto: SignInDto,
  ): Promise<{ accessToken: string; user: User }> {
    const { email, password } = signInDto;

    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user || user.length === 0)
      throw new BadRequestException('Correo inválido');

    const userData = user[0];

    const isPasswordMatch = await this.bcryptService.compare(
      password,
      userData.password,
    );

    if (!isPasswordMatch) throw new BadRequestException('Contraseña inválida');

    const tokenData = await this.generateAccessToken(userData);

    return { accessToken: tokenData.accessToken, user: userData };
  }

  async signOut(userId: number): Promise<void> {
    await this.cacheService.delete(`user-${String(userId)}`);
  }

  async generateAccessToken(
    user: Partial<User>,
  ): Promise<{ accessToken: string }> {
    const tokenId = randomUUID();
    const ttl = +(this.jwtConfiguration.accessTokenTtl || 3600);

    // ✅ Guardar tokenId en caché
    console.log(`💾 Guardando en caché: user-${user.id} = ${tokenId}`);
    await this.cacheService.set(`user-${String(user.id)}`, tokenId, ttl);

    const accessToken = await this.jwtService.signAsync(
      {
        id: String(user.id),
        email: user.email,
        roleId: user.roleId,
        tokenId,
      } as ActiveUserData,
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: ttl,
      },
    );

    return { accessToken };
  }
}
