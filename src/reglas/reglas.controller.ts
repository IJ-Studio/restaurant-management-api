import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { ReglasService, type Reglas } from './reglas.service';

@ApiTags('reglas')
@Controller('reglas')
export class ReglasController {
  constructor(private readonly reglas: ReglasService) {}

  /** Reglas de operación (horario, antelación, capacidad, cantidades). Públicas: las usa también la web. */
  @Public()
  @Get()
  obtener(): Promise<Reglas> {
    return this.reglas.obtener();
  }
}
