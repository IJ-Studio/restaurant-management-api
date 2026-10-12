import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InferSelectModel, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
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

/**
 * Lo único que sale en la respuesta del login: lista de campos permitidos, así una columna
 * sensible nueva en `users` no se filtra por accidente (nunca contraseña ni contadores).
 */
export type PublicUser = Pick<
  User,
  | 'id'
  | 'name'
  | 'lastname'
  | 'email'
  | 'phone'
  | 'verified'
  | 'roleId'
  | 'isActive'
  | 'createdAt'
>;

export function toPublicUser(user: User): PublicUser {
  const {
    id,
    name,
    lastname,
    email,
    phone,
    verified,
    roleId,
    isActive,
    createdAt,
  } = user;
  return {
    id,
    name,
    lastname,
    email,
    phone,
    verified,
    roleId,
    isActive,
    createdAt,
  };
}

// Mismo mensaje para correo inexistente, contraseña incorrecta o cuenta inactiva (no revela qué falló).
export const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';

// Hash bcrypt de un valor aleatorio: se compara aunque el correo no exista para igualar el tiempo de respuesta.
const DUMMY_HASH =
  '$2b$10$oJHiB2hZhfyfSowA4DEJM.jlrgAvIfNM2az2feX0sx2llt63s0Qt2';

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
    } catch {
      throw new BadRequestException(
        'Error al crear el usuario. El email ya existe.',
      );
    }
  }

  async SignIn(
    signInDto: SignInDto,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const { email, password } = signInDto;

    const [userData] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    const isPasswordMatch = await this.bcryptService.compare(
      password,
      userData?.password ?? DUMMY_HASH,
    );

    if (!userData || !isPasswordMatch || !userData.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const tokenData = await this.generateAccessToken(userData);

    return { accessToken: tokenData.accessToken, user: toPublicUser(userData) };
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
