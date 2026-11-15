import { Module } from '@nestjs/common';

import { PagosModule } from '../pagos/pagos.module';
import { FacturasAdminController } from './facturas-admin.controller';
import { FacturasAdminService } from './facturas-admin.service';

@Module({
  imports: [PagosModule],
  controllers: [FacturasAdminController],
  providers: [FacturasAdminService],
})
export class FacturasAdminModule {}
