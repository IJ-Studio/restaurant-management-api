import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SitioController } from './sitio.controller';
import { SitioService } from './sitio.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SitioController],
  providers: [SitioService],
})
export class SitioModule {}
