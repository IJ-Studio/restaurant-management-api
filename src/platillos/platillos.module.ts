import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { PlatillosController } from './platillos.controller';
import { PlatillosService } from './platillos.service';

@Module({
  imports: [ReportsModule],
  controllers: [PlatillosController],
  providers: [PlatillosService],
  exports: [PlatillosService],
})
export class PlatillosModule {}

