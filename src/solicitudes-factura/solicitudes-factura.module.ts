import { Module } from '@nestjs/common';

import { CorreoModule } from '../correo/correo.module';
import { DatabaseModule } from '../database/database.module';
import { PagosModule } from '../pagos/pagos.module';
import { SolicitudesFacturaController } from './solicitudes-factura.controller';
import { SolicitudesFacturaService } from './solicitudes-factura.service';

@Module({
  imports: [DatabaseModule, PagosModule, CorreoModule],
  controllers: [SolicitudesFacturaController],
  providers: [SolicitudesFacturaService],
})
export class SolicitudesFacturaModule {}
