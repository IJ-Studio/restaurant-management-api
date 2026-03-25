import { Module, Global } from '@nestjs/common';
import { DrizzleProvider } from './drizzle.provider';
import { SupabaseService } from './supabase.service';
@Global()
@Module({
  providers: [DrizzleProvider, SupabaseService],
  exports: [DrizzleProvider, SupabaseService],
})
export class DatabaseModule {}
