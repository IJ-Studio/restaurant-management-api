import { Injectable, Logger } from '@nestjs/common';

import { ROLES } from '../common/constants/roles';
import { DeviceTokensService } from './device-tokens.service';

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

/** Envío de notificaciones push vía Expo (HU-07, #75). Los tokens los guarda DeviceTokensService. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly deviceTokens: DeviceTokensService) {}

  /**
   * Envía una notificación a todos los dispositivos de usuarios activos con alguno de los roles.
   * Nunca lanza: una falla de notificaciones no debe tumbar la operación que la disparó (por
   * ejemplo, cambiar el estado de un pedido).
   */
  async sendToRoles(roleIds: number[], message: PushMessage): Promise<void> {
    try {
      const allowed = roleIds.filter((r) => STAFF_ROLES.includes(r));
      if (allowed.length === 0) return;

      const tokens = await this.deviceTokens.findTokensByRoles(allowed);
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
    await this.deviceTokens.removeTokens(dead);
  }
}
