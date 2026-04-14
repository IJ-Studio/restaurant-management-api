import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MenuService } from './menu.service';
import { QueryPlatillosDto } from './dto/query-platillos.dto';
// import { CreatePlatilloDto } from './dto/create-platillo.dto';
// import { UpdatePlatilloDto } from './dto/update-platillo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../../src/common/constants/roles';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Endpoint raíz público para compatibilidad con el front actual
  @Public()
  @Get()
  async getPublicMenu(@Query('categoriaId') categoriaId?: string) {
    return this.menuService.getPublicPlatillos(
      categoriaId ? parseInt(categoriaId) : undefined,
    );
  }

  //  Endpoints públicos (para landing)
  @Public()
  @Get('platillos')
  async getPublicPlatillos(@Query('categoriaId') categoriaId?: string) {
    return this.menuService.getPublicPlatillos(
      categoriaId ? parseInt(categoriaId) : undefined,
    );
  }

  // @Get('categorias')
  // async getCategorias() {
  //   // Implementar método en service/repository para obtener categorías activas
  //   return this.menuService.getPublicCategorias();
  // }

  //   //  Endpoints protegidos (admin)
  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(ROLES.ADMIN)
  //   @Get()
  //   findAll(@Query() query: QueryPlatillosDto) {
  //     return this.menuService.findAll(query);
  //   }

  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(ROLES.ADMIN)
  //   @Get(':id')
  //   findOne(@Param('id') id: string) {
  //     return this.menuService.findOne(+id);
  //   }

  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(ROLES.ADMIN)
  //   @Post()
  //   create(@Body() createPlatilloDto: CreatePlatilloDto) {
  //     return this.menuService.create(createPlatilloDto);
  //   }

  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(ROLES.ADMIN)
  //   @Patch(':id')
  //   update(
  //     @Param('id') id: string,
  //     @Body() updatePlatilloDto: UpdatePlatilloDto,
  //   ) {
  //     return this.menuService.update(+id, updatePlatilloDto);
  //   }

  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(ROLES.ADMIN)
  //   @Delete(':id')
  //   remove(@Param('id') id: string) {
  //     return this.menuService.delete(+id);
  //   }
}
