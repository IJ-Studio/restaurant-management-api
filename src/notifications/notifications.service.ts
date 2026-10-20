import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DRIZZLE } from '../database/drizzle/constants';
import * as schema from '../database/schema/public.schema';
import { users } from '../database/schema/public.schema';
import { dispositivosPush } from '../database/schema/notifications.schema';
import { ROLES } from '../common/constants/roles';

import type { RegisterDeviceDto } from './dto/register-device.dto';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100; // máximo por petición que admite Expo
const PUSH_TIMEOUT_MS = 5_000;

// Solo el personal recibe notificaciones operativas; los clientes (rol 5) no.
const STAFF_ROLES: number[] = [
  ROLES.ADMIN,
  ROLES.CAJERO,
  ROLES.MESERO,
  ROLES.COCINA,
];

/**
 * Contenido de la notificación. Deliberadamente solo texto operativo genérico (p. ej. "Pedido
 * listo en mesa 4"): nunca nombres, teléfonos, correos ni importes de clientes, porque el payload
 * pasa por los servidores de Expo/Apple/Google.
 */
export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string | number>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /** Registra (o reasigna) el token del dispositivo al usuario autenticado. */
  async registerDevice(userId: number, dto: RegisterDeviceDto): Promise<void> {
    await this.db
      .insert(dispositivosPush)
      .values({ userId, token: dto.token, platform: dto.platform })
      .onConflictDoUpdate({
        target: dispositivosPush.token,
        set: {
          userId,
          platform: dto.platform,
          updatedAt: new Date().toISOString(),
        },
      });
  }

  /** Borra el token SOLO si pertenece al usuario que lo pide (no se pueden borrar los de otros). */
  async unregisterDevice(userId: number, token: string): Promise<void> {
    await this.db
      .delete(dispositivosPush)
      .where(
        and(
          eq(dispositivosPush.token, token),
          eq(dispositivosPush.userId, userId),
        ),
      );
  }

  /**
   * Envía una notificación a todos los dispositivos de usuarios activos con alguno de los roles.
   * Nunca lanza: una falla de notificaciones no debe tumbar la operación que la disparó (por
   * ejemplo, cambiar el estado de un pedido).
   */
  async sendToRoles(roleIds: number[], message: PushMessage): Promise<void> {
    try {
      const allowed = roleIds.filter((r) => STAFF_ROLES.includes(r));
      if (allowed.length === 0) return;

      const rows = await this.db
        .select({ token: dispositivosPush.token })
        .from(dispositivosPush)
        .innerJoin(users, eq(users.id, dispositivosPush.userId))
        .where(and(inArray(users.roleId, allowed), eq(users.isActive, true)));

      const tokens = rows.map((r) => r.token);
      for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
        await this.sendBatch(tokens.slice(i, i + EXPO_BATCH_SIZE), message);
      }
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la notificación: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendBatch(
    tokens: string[],
    message: PushMessage,
  ): Promise<void> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: 'default',
        })),
      ),
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
    });

    if (!response.ok) {
      this.logger.error(`Expo respondió ${String(response.status)}`);
      return;
    }

    const { data } = (await response.json()) as { data?: ExpoTicket[] };
    // Los tickets vienen en el mismo orden que los mensajes: se limpian los tokens muertos.
    const dead = tokens.filter(
      (_t, i) => data?.[i]?.details?.error === 'DeviceNotRegistered',
    );
    if (dead.length > 0) {
      await this.db
        .delete(dispositivosPush)
        .where(inArray(dispositivosPush.token, dead));
    }
  }
}
