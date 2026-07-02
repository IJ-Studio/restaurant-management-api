import { Controller, Get, Query, Param, ParseIntPipe, Post, Body } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MenuService } from './menu.service';

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

  // Endpoints públicos (para landing)
  @Public()
  @Get('platillos')
  async getPublicPlatillos(@Query('categoriaId') categoriaId?: string) {
    return this.menuService.getPublicPlatillos(
      categoriaId ? parseInt(categoriaId) : undefined,
    );
  }

  // Categorías con productos anidados
  @Public()
  @Get('categories/with-products')
  async getCategoriesWithProducts() {
    return await this.menuService.getCategoriesWithProducts();
  }

  // NUEVO ENDPOINT: Recibe y valida el ID para retornar el platillo específico
  // Responde exactamente a la ruta solicitada por Next.js: /api/menu/items/[id]
  @Public()
  @Get('items/:id')
  async getPlatilloById(@Param('id', ParseIntPipe) id: number) {
    return await this.menuService.getPlatilloById(id);
  }

  // 👇 NUEVO ENDPOINT PARA PEDIDOS EN MESA Y DOMICILIO
  // Vinculado a la ruta: POST /menu/orders
  @Public()
  @Post('orders')
  async createOrder(@Body() orderData: any) {
    // Delegamos la lógica de negocio e inserción en la BD al servicio
    return await this.menuService.createOrderFromMenu(orderData);
  }
}
