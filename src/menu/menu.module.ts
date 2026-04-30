import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../src/database/database.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { PlatillosRepository } from './repositories/platillos.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [MenuController],
  providers: [MenuService, PlatillosRepository],
  exports: [MenuService],
})
export class MenuModule {}
