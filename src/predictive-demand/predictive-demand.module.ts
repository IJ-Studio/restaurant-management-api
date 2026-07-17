import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PredictiveDemandController } from './predictive-demand.controller';
import { PredictiveDemandService } from './predictive-demand.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PredictiveDemandController],
  providers: [PredictiveDemandService],
})
export class PredictiveDemandModule {}
