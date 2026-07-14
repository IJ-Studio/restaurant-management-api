import { Controller, Post, Patch, Delete, Param, Body, Get, Query, BadRequestException } from '@nestjs/common';
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
    // FIX: antes, cualquier presencia de "usuarioId" activaba la rama de
    // domicilio, aunque viniera acompañando a "mesaId". Ahora se revisa
    // mesaId primero, ya que las consultas de mesa también necesitan
    // usuarioId (para saber de quién es el carrito), pero no son
    // pedidos a domicilio.
    if (mesaId) {
      return await this.ordersService.findOrdersByUser(
        mesaId,
        usuarioId ? Number(usuarioId) : undefined,
      );
    }

    if (tipo === 'domicilio' || usuarioId) {
      if (!usuarioId) {
        throw new BadRequestException('El parámetro usuarioId es requerido para pedidos a domicilio.');
      }
      return await this.ordersService.findDeliveryOrdersByUser(Number(usuarioId));
    }

    throw new BadRequestException('Debes indicar mesaId o usuarioId.');
  }

  // FIX (nuevo): manda a cocina un pedido de mesa que estaba en 'pendiente'
  // (carrito). El frontend llama esto cuando el cliente presiona
  // "Confirmar" en /menu/pedido.
  @Public()
  @Post('confirmar/:id')
  async confirmarOrdenMesa(@Param('id') id: string) {
    return await this.ordersService.confirmarOrdenMesa(id);
  }

  // FIX (nuevo): quita un producto individual de un pedido que sigue en
  // 'pendiente' (carrito de mesa o de domicilio). El id es el de la fila
  // en orden_items, no el de la orden completa.
  @Public()
  @Delete('item/:id')
  async eliminarItem(@Param('id') id: string) {
    return await this.ordersService.eliminarItemOrden(Number(id));
  }

  @Public()
  @Patch('cancelar/:id')
  async cancelarOrden(@Param('id') id: string) {
    return await this.ordersService.cancelarOrden(id);
  }
}
