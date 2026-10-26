import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InferSelectModel, eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './../database/schema/public.schema';
import { users } from './../database/schema/public.schema';

import { ROLES } from '../common/constants/roles';
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

// Bloqueo por cuenta: tras 5 contraseñas incorrectas seguidas, 15 minutos sin poder entrar.
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
// El web (hooks/useLockout) detecta "Demasiados intentos" y toma el primer número como segundos
// de espera, así que ese número debe ser el primero del mensaje.
export const accountLockedMessage = (seconds: number): string =>
  `Demasiados intentos. Debes esperar ${seconds} segundos.`;

// Registro rechazado por correo repetido: no dice cuál dato falló, para no confirmar qué correos
// tienen cuenta (enumeración de usuarios), y orienta a quien sí ya se registró.
export const SIGN_UP_FAILED_MESSAGE =
  'No se pudo crear la cuenta con esos datos. Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.';

const PG_UNIQUE_VIOLATION = '23505';

/** Drizzle envuelve el error del driver: el código de Postgres puede estar en `cause`. */
const isUniqueViolation = (error: unknown): boolean => {
  const codeOf = (e: unknown): unknown =>
    typeof e === 'object' && e !== null && 'code' in e
      ? (e as { code?: unknown }).code
      : undefined;
  const cause =
    typeof error === 'object' && error !== null && 'cause' in error
      ? (error as { cause?: unknown }).cause
      : undefined;
  return (
    codeOf(error) === PG_UNIQUE_VIOLATION ||
    codeOf(cause) === PG_UNIQUE_VIOLATION
  );
};

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

  async SignUp(signUpDto: SignUpDto): Promise<PublicUser> {
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
          roleId: ROLES.CLIENTE,
        })
        .returning();

      // Nunca se devuelve la fila completa: traía el hash de la contraseña.
      return toPublicUser(user[0]);
    } catch (error) {
      // Correo ya registrado (violación de la restricción UNIQUE de `users.email`): mensaje
      // genérico que no confirma que ese correo tenga cuenta. Cualquier OTRO fallo ya no se
      // disfraza de "el email ya existe": se deja subir y Nest responde 500.
      if (isUniqueViolation(error)) {
        throw new BadRequestException(SIGN_UP_FAILED_MESSAGE);
      }
      throw error;
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

    // Cuenta bloqueada: se corta antes de comparar la contraseña (no se puede seguir adivinando).
    // Solo existe para correos registrados; un correo inexistente cae en el 401 genérico de abajo.
    const lockRemainingMs = (userData?.loginLockUntil ?? 0) - Date.now();
    if (userData && lockRemainingMs > 0) {
      const retryAfterSeconds = Math.ceil(lockRemainingMs / 1000);
      const message = accountLockedMessage(retryAfterSeconds);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
          // El proxy de login del web lee `error` (no `message`) para mostrar el texto.
          error: message,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isPasswordMatch = await this.bcryptService.compare(
      password,
      userData?.password ?? DUMMY_HASH,
    );

    if (!userData || !isPasswordMatch || !userData.isActive) {
      // Solo la contraseña incorrecta de una cuenta real suma intentos (no una cuenta inactiva).
      if (userData && !isPasswordMatch) {
        await this.registerFailedLogin(userData.id);
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (userData.loginAttempts > 0 || userData.loginLockUntil !== 0) {
      await this.resetLoginAttempts(userData.id);
    }

    const tokenData = await this.generateAccessToken(userData);

    return { accessToken: tokenData.accessToken, user: toPublicUser(userData) };
  }

  /** Suma un intento fallido (incremento atómico en SQL) y bloquea la cuenta al llegar al máximo. */
  private async registerFailedLogin(userId: number): Promise<void> {
    const [updated] = await this.db
      .update(users)
      .set({ loginAttempts: sql`${users.loginAttempts} + 1` })
      .where(eq(users.id, userId))
      .returning({ loginAttempts: users.loginAttempts });

    if (updated && updated.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      await this.db
        .update(users)
        .set({ loginAttempts: 0, loginLockUntil: Date.now() + LOGIN_LOCK_MS })
        .where(eq(users.id, userId));
    }
  }

  private async resetLoginAttempts(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ loginAttempts: 0, loginLockUntil: 0 })
      .where(eq(users.id, userId));
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
