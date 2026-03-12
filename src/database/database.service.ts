import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(private config: ConfigService) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const supabaseKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    // Validar que las variables de entorno existan
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidas en .env',
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient() {
    return this.client;
  }
}
