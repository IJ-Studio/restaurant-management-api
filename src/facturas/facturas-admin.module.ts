import { Module } from '@nestjs/common';

import { FacturasAdminController } from './facturas-admin.controller';
import { FacturasAdminService } from './facturas-admin.service';

@Module({
  controllers: [FacturasAdminController],
  providers: [FacturasAdminService],
})
export class FacturasAdminModule {}
