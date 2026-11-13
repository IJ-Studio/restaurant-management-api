import { ReglasModule } from '../reglas/reglas.module';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [ReglasModule, DatabaseModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
