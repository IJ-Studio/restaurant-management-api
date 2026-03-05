import * as dotenv from 'dotenv'; 
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: '.env.development' });

export default defineConfig({
  schema: './src/database/drizzle/schema.ts',
  out: './src/database/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
