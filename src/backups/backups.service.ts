/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DRIZZLE } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { backups } from '../database/schema';
import { GoogleDriveService } from './google-drive.service';
import { desc, eq, sql } from 'drizzle-orm';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private drive: GoogleDriveService,
  ) {}

  // ── Exporta todas las tablas a JSON ────────────────────────────────────────
  private async exportAllTables() {
    const tableNamesResult = await this.db.execute<{ table_name: string }>(
      sql`
        select table_name
        from information_schema.tables
        where table_schema = ${'public'}
          and table_type = 'BASE TABLE'
        order by table_name
      `,
    );

    const tables: Record<string, { count: number; data: unknown[] }> = {};

    const tableNames = tableNamesResult as unknown as Array<{
      table_name: string;
    }>;

    for (const { table_name } of tableNames) {
      const rowsResult = await this.db.execute<Record<string, unknown>>(
        sql`select * from ${sql.identifier('public')}.${sql.identifier(table_name)}`,
      );
      const rows = rowsResult as unknown as Array<Record<string, unknown>>;

      const data =
        table_name === 'users'
          ? rows.map(({ password, ...rest }) => rest)
          : rows;

      tables[table_name] = {
        count: Array.isArray(data) ? data.length : 0,
        data: (Array.isArray(data) ? data : []) as unknown[],
      };
    }

    return { exportedAt: new Date().toISOString(), version: '1.0', tables };
  }

  // ── Crear backup (manual o auto) ────────────────────────────────────────────
  async createBackup(type: 'manual' | 'auto' = 'manual') {
    const now = new Date();
    const name = `backup_${type}_${now.toISOString().slice(0, 10)}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      // 1. Exportar datos
      const data = await this.exportAllTables();
      const json = JSON.stringify(
        data,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      );
      const sizeBytes = Buffer.byteLength(json, 'utf-8');
      const rowCount = Object.values(data.tables).reduce(
        (sum, t) => sum + t.count,
        0,
      );

      // 2. Subir a Google Drive
      const { fileId, webViewLink } = await this.drive.uploadFile(
        `${name}.json`,
        json,
      );

      // 3. Guardar registro en BD
      const [record] = await this.db
        .insert(backups)
        .values({
          name,
          sizeBytes,
          driveFileId: fileId,
          driveUrl: webViewLink,
          type,
          status: 'ok',
          tables: Object.keys(data.tables),
          rowCount,
        })
        .returning();

      this.logger.log(`Backup creado: ${name} (${sizeBytes} bytes)`);
      return record;
    } catch (error) {
      // Guardar el error en BD
      const [record] = await this.db
        .insert(backups)
        .values({
          name,
          sizeBytes: 0,
          type,
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Error desconocido',
          tables: [],
          rowCount: 0,
        })
        .returning();

      this.logger.error(`Error en backup: ${error}`);
      return record;
    }
  }

  // ── Obtener historial ───────────────────────────────────────────────────────
  async getBackups() {
    return this.db
      .select()
      .from(backups)
      .orderBy(desc(backups.createdAt))
      .limit(20);
  }

  // ── Eliminar backup ─────────────────────────────────────────────────────────
  async deleteBackup(id: number) {
    const [backup] = await this.db
      .select()
      .from(backups)
      .where(eq(backups.id, id));

    if (!backup) throw new Error('Backup no encontrado');

    // Eliminar de Drive si existe
    if (backup.driveFileId) {
      await this.drive.deleteFile(backup.driveFileId).catch(() => {
        this.logger.warn(`No se pudo eliminar de Drive: ${backup.driveFileId}`);
      });
    }

    await this.db.delete(backups).where(eq(backups.id, id));
    return { deleted: id };
  }

  // ── Backup automático diario a las 23:00 ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Cron('0 23 * * *' as const)
  async scheduledBackup(): Promise<void> {
    this.logger.log('Ejecutando backup automático...');
    await this.createBackup('auto');
  }
}
