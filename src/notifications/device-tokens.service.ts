import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { deviceTokens } from '../database/schema/device-tokens.schema';
import { users } from '../database/schema/public.schema';
import type { RegisterDeviceDto } from './dto/register-device.dto';

/**
 * Tokens de Expo Push por usuario y dispositivo (HU-07). Los usa el envío de
 * notificaciones (#75) para saber a qué celulares mandar cada aviso.
 */
@Injectable()
export class DeviceTokensService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Alta o actualización: el mismo token se reasigna al usuario que inició sesión. */
  async register(userId: number, dto: RegisterDeviceDto): Promise<void> {
    await this.db
      .insert(deviceTokens)
      .values({ userId, token: dto.token, platform: dto.platform })
      .onConflictDoUpdate({
        target: deviceTokens.token,
        set: { userId, platform: dto.platform, updatedAt: sql`now()` },
      });
  }

  /** Al cerrar sesión. Solo borra el token si es del usuario que lo pide. */
  async unregister(userId: number, token: string): Promise<void> {
    await this.db
      .delete(deviceTokens)
      .where(
        and(eq(deviceTokens.token, token), eq(deviceTokens.userId, userId)),
      );
  }

  async findTokensByUserIds(userIds: number[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await this.db
      .select({ token: deviceTokens.token })
      .from(deviceTokens)
      .where(inArray(deviceTokens.userId, userIds));
    return rows.map((row) => row.token);
  }

  /** Tokens del personal activo con alguno de los roles (p. ej. avisar a cocina). */
  async findTokensByRoles(roleIds: number[]): Promise<string[]> {
    if (roleIds.length === 0) return [];
    const rows = await this.db
      .select({ token: deviceTokens.token })
      .from(deviceTokens)
      .innerJoin(users, eq(users.id, deviceTokens.userId))
      .where(and(inArray(users.roleId, roleIds), eq(users.isActive, true)));
    return rows.map((row) => row.token);
  }

  /** Expo responde `DeviceNotRegistered` cuando la app se desinstaló: esos tokens se borran. */
  async removeTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.db
      .delete(deviceTokens)
      .where(inArray(deviceTokens.token, tokens));
  }
}
