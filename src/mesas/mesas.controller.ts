import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { MesasService } from './mesas.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('mesas')
export class MesasController {
  constructor(private readonly mesasService: MesasService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMesas() {
    return await this.mesasService.findAll();
  }
}
