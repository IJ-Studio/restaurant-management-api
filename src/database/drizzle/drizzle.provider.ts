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

    // Las variables de entorno llegan como texto; un valor vacío o inválido usa el de por defecto.
    const numberFrom = (key: string, fallback: number): number => {
      const value = Number(config.get<string>(key));
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    // postgres-js mide idle_timeout y connect_timeout en SEGUNDOS. Las variables se definen en
    // milisegundos, así que se convierten: antes, 5000 "ms" eran 5000 s y una conexión trabada con
    // el pooler dejaba las peticiones colgadas ~83 minutos sin ningún error en el log.
    const secondsFromMs = (key: string, fallbackMs: number): number =>
      Math.ceil(numberFrom(key, fallbackMs) / 1000);

    const client = postgres(url, {
      ssl: config.get<string>('DATABASE_SSL') === 'true' ? 'require' : false,
      max: numberFrom('DATABASE_POOL_MAX', 10),
      idle_timeout: secondsFromMs('DATABASE_POOL_IDLE_TIMEOUT', 30000),
      connect_timeout: secondsFromMs('DATABASE_CONNECTION_TIMEOUT', 5000),
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
