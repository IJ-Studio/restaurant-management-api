import { defineConfig, Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

export default defineConfig({
  // schema: './src/database/schema/index.ts',
  schema: './src/database/schema/*.schema.ts',
  out: './src/database/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL!,
  },
  // schemaFilter: ['sgr', 'sgr_audit'],
  verbose: true,
  strict: true,
}) satisfies Config;
