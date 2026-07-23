import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ConfigService } from '@nestjs/config';
import { schema } from '../schema/index';
import { DRIZZLE } from './constants';

export const DrizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const url = config.getOrThrow<string>('DATABASE_URL');

    const client = postgres(url, {
      ssl: config.get<string>('DATABASE_SSL') === 'true' ? 'require' : false,
      max: config.get<number>('DATABASE_POOL_MAX') ?? 10,
      idle_timeout: config.get<number>('DATABASE_POOL_IDLE_TIMEOUT') ?? 30000,
      connect_timeout:
        config.get<number>('DATABASE_CONNECTION_TIMEOUT') ?? 5000,
      // El DATABASE_URL apunta al pooler de Supabase en modo "transaction"
      // (puerto 6543), que no soporta prepared statements por conexión —
      // sin esto, postgres-js puede leer columnas desalineadas/undefined
      // de forma intermitente (ver error en getAllUsers/timestamp mapping).
      prepare: false,
    });
    return drizzle(client, { schema });
  },
};
export type DrizzleDB = ReturnType<typeof drizzle>;
