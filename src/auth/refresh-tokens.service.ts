import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { refreshTokens } from '../database/schema/refresh-tokens.schema';

export const REFRESH_TOKEN_TTL_DAYS = 30;

const hashOf = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/**
 * Tokens de refresco de un solo uso. El token es aleatorio (48 bytes) y en la base solo queda su
 * hash: quien lea la tabla no puede usarlos.
 */
@Injectable()
export class RefreshTokensService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async issue(userId: number): Promise<string> {
    // Limpieza al paso: caducados y revocados hace más de un día (ese día sirve para detectar reutilización).
    await this.db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          or(
            lt(refreshTokens.expiresAt, sql`now()`),
            lt(refreshTokens.revokedAt, sql`now() - interval '1 day'`),
          ),
        ),
      );

    const token = randomBytes(48).toString('base64url');
    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash: hashOf(token),
      expiresAt: sql`now() + make_interval(days => ${REFRESH_TOKEN_TTL_DAYS})`,
    });
    return token;
  }

  /**
   * Gasta el token y devuelve a su dueño, o `null` si no sirve (desconocido, caducado o ya usado).
   * Si llega uno ya usado, alguien más tiene una copia: se revocan todos los del usuario.
   */
  async consume(token: string): Promise<number | null> {
    const tokenHash = hashOf(token);
    // Un solo UPDATE: dos renovaciones simultáneas con el mismo token no pueden ganar las dos.
    const [used] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, sql`now()`),
        ),
      )
      .returning({ userId: refreshTokens.userId });
    if (used) return used.userId;

    const [known] = await this.db
      .select({
        userId: refreshTokens.userId,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    if (known?.revokedAt) await this.revokeAllForUser(known.userId);
    return null;
  }

  /** Cierre de sesión en un dispositivo. */
  async revoke(token: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashOf(token)),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }
}
