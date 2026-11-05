import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollMovimientosController } from './payroll-movimientos.controller';
import { PayrollMovimientosService } from './payroll-movimientos.service';

@Module({
  // Movimientos primero: sus rutas fijas no deben caer en las de :id.
  controllers: [PayrollMovimientosController, PayrollController],
  providers: [PayrollService, PayrollMovimientosService],
  exports: [PayrollService],
})
export class PayrollModule {}
