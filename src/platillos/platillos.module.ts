import { Module } from '@nestjs/common';
import { PlatillosController } from './platillos.controller';
import { PlatillosService } from './platillos.service';
import { ReportsModule } from '..//reports/reports.module';

@Module({
  imports: [ReportsModule],
  controllers: [PlatillosController],
  providers: [PlatillosService],
})
export class PlatillosModule {}

