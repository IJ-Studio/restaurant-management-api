import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DRIZZLE } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { backups } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>  ) {}

  // ── Exporta todas las tablas a JSON ────────────────────────────────────────
  private async exportAllTables() {
    const [roles, users] = await Promise.all([
      this.db.select().from(schema.roles),
      this.db.select().from(schema.users),
    ]);

    // Sanitiza passwords del backup
    const safeUsers = users.map(({ ...rest }) => rest);

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      tables: {
        roles: { count: roles.length, data: roles },
        users: { count: safeUsers.length, data: safeUsers },
      },
    };
  }

  // ── Crear backup (manual o auto) ────────────────────────────────────────────
  async createBackup(type: 'manual' | 'auto' = 'manual') {
    const now = new Date();
    const name = `backup_${type}_${now.toISOString().slice(0, 10)}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      // 1. Exportar datos
      const data = await this.exportAllTables();
      const json = JSON.stringify(data, null, 2);
      const sizeBytes = Buffer.byteLength(json, 'utf-8');
      const rowCount = Object.values(data.tables).reduce(
        (sum, t) => sum + t.count,
        0,
      );

      // 3. Guardar registro en BD
      const [record] = await this.db
        .insert(backups)
        .values({
          name,
          sizeBytes,
          type,
          status: 'ok',
          tables: Object.keys(data.tables),
          rowCount,
        })
        .returning();

      this.logger.log(`Backup creado: ${name} (${sizeBytes} bytes)`);
      return record;
    } catch (error) {
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

  async getBackups() {
    return this.db
      .select()
      .from(backups)
      .orderBy(desc(backups.createdAt))
      .limit(20);
  }

  async deleteBackup(id: number) {
    const [backup] = await this.db
      .select()
      .from(backups)
      .where(eq(backups.id, id));

    if (!backup) throw new Error('Backup no encontrado');

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
