import { Controller, Post, Patch, Param, Body, Get, Query, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderMesaDto } from './dto/create-order-mesa.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('pedidos')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('mesa')
  async createOrderMesa(@Body() createOrderMesaDto: CreateOrderMesaDto) {
    return await this.ordersService.createOrderMesa(createOrderMesaDto);
  }

  @Public()
  @Get('usuario')
  async getOrdersByUser(
    @Query('mesaId') mesaId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('tipo') tipo?: string,
  ) {
    // FIX: antes, si tipo === 'domicilio' pero no llegaba usuarioId, el
    // código usaba "mesaId" como si fuera el id del usuario
    // (`const idBuscar = usuarioId || mesaId`), lo cual era incorrecto y
    // además el service ignoraba usuarioId por completo, devolviendo las
    // órdenes a domicilio de TODOS los usuarios (fuga de datos). Ahora
    // usuarioId es obligatorio y realmente se usa para filtrar.
    if (tipo === 'domicilio' || usuarioId) {
      if (!usuarioId) {
        throw new BadRequestException('El parámetro usuarioId es requerido para pedidos a domicilio.');
      }
      return await this.ordersService.findDeliveryOrdersByUser(Number(usuarioId));
    }

    if (!mesaId) {
      throw new BadRequestException('El parámetro mesaId es requerido.');
    }
    // FIX: mesaId aquí es el "numero" físico de la mesa (varchar), no el
    // id interno. La resolución numero -> id ahora ocurre en el service.
    return await this.ordersService.findOrdersByUser(mesaId);
  }

  // FIX: este endpoint no existía. El frontend (handleCancelarOrden en
  // app/menu/pedido/page.tsx) hace PATCH a /pedidos/cancelar/:id pero no
  // había ninguna ruta que lo atendiera, aunque el método sí existía en
  // OrdersService. Por eso "cancelar" nunca funcionaba.
  @Public()
  @Patch('cancelar/:id')
  async cancelarOrden(@Param('id') id: string) {
    return await this.ordersService.cancelarOrden(id);
  }
}
