import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import { DRIZZLE } from './database/drizzle/constants';
import type { DrizzleDB } from './database/drizzle/drizzle.provider';
import { sql } from 'drizzle-orm';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

@Public() // <-- Hace que esta ruta no requiera token
  @Get()
  async getStatus() {
    const packageJson = require('../package.json');

    // Verificar conexión a la base de datos
    let database: string;
    try {
      await this.db.execute(sql`SELECT 1`);
      database = 'conectado';
    } catch {
      database = 'error';
    }

    return {
      status: 'online',
      message: 'API Restaurant Management funcionando correctamente',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      version: packageJson.version || '1.0.0',
      uptime: `${process.uptime().toFixed(2)} segundos`,
      memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      host: os.hostname(),
      database,
    };
  }
}
