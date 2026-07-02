import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { PlatillosRepository } from './repositories/platillos.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MenuController],
  providers: [MenuService, PlatillosRepository],
})
export class MenuModule {}
