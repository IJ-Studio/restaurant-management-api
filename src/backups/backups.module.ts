import { Module } from '@nestjs/common';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { SupabaseService } from './supabase.service'
@Module({
  controllers: [BackupsController],
  providers: [BackupsService, SupabaseService],
})
export class BackupsModule {}
