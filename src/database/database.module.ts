import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { SupabaseService } from './database.service';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    SupabaseService,
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DB_POOL_URL');
        const client = postgres(connectionString || '', { prepare: false });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [SupabaseService, DRIZZLE], 
})
export class DatabaseModule {}
