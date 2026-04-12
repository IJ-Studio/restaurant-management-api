import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DB_POOL_URL') || config.get<string>('DATABASE_URL');
        const dbSSL = config.get<string>('DATABASE_SSL') === 'true';

        const client = postgres(connectionString || '', {
          prepare: false,
          ssl: dbSSL ? 'require' : false,
        });

        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule { }
