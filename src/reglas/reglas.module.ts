import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ReglasController } from './reglas.controller';
import { ReglasService } from './reglas.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReglasController],
  providers: [ReglasService],
  exports: [ReglasService],
})
export class ReglasModule {}
