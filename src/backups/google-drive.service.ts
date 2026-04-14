import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class GoogleDriveService {
  // Mantengo el nombre para no cambiar BackupsService ni BackupsModule
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket =
      this.config.get<string>('SUPABASE_BACKUPS_BUCKET') || 'backups';

    if (!url || !serviceRoleKey) {
      throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabase = createClient(url, serviceRoleKey);
    this.bucket = bucket;
  }

  async uploadFile(
    fileName: string,
    content: string,
  ): Promise<{ fileId: string; webViewLink: string }> {
    const filePath = `backups/${Date.now()}_${fileName}`;
    const body = Buffer.from(content, 'utf-8');

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filePath, body, {
        contentType: 'application/json',
        upsert: false,
      });

    if (error) {
      throw new Error(`Error subiendo backup a Supabase: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    return {
      fileId: filePath,
      webViewLink: data.publicUrl,
    };
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(fileId);

    if (error || !data) {
      throw new Error(`Error descargando backup de Supabase: ${error?.message ?? 'sin datos'}`);
    }

    // data es un Blob, lo convertimos a Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(fileId: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([fileId]);
    if (error) {
      throw new Error(`Error eliminando backup de Supabase: ${error.message}`);
    }
  }
}
