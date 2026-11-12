import { Module } from '@nestjs/common';

import { RegistrosEliminadosController } from './registros-eliminados.controller';
import { RegistrosEliminadosService } from './registros-eliminados.service';

@Module({
  controllers: [RegistrosEliminadosController],
  providers: [RegistrosEliminadosService],
})
export class RegistrosEliminadosModule {}
