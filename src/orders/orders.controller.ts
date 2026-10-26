import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrdersService, type OrderRequester } from './orders.service';
import { CreateOrderMesaDto } from './dto/create-order-mesa.dto';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

@Controller('pedidos')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private requester(user: ActiveUserData): OrderRequester {
    return { id: Number(user.id), roleId: user.roleId };
  }

  @Post('mesa')
  async createOrderMesa(
    @Body() createOrderMesaDto: CreateOrderMesaDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.ordersService.createOrderMesa(
      createOrderMesaDto,
      Number(user.id),
    );
  }

  @Get('usuario')
  async getOrdersByUser(
    @Query('mesaId') mesaId: string | undefined,
    @Query('tipo') tipo: string | undefined,
    @ActiveUser() user: ActiveUserData,
  ) {
    const requester = this.requester(user);

    if (mesaId) {
      return await this.ordersService.findOrdersByUser(mesaId, requester);
    }

    if (tipo === 'domicilio') {
      return await this.ordersService.findDeliveryOrdersByUser(requester.id);
    }

    throw new BadRequestException('Debes indicar mesaId o tipo=domicilio.');
  }

  // Manda a cocina un pedido de mesa que estaba en 'pendiente' (carrito).
  // El frontend llama esto cuando el cliente presiona "Confirmar" en /menu/pedido.
  @Post('confirmar/:id')
  async confirmarOrdenMesa(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.ordersService.confirmarOrdenMesa(
      id,
      this.requester(user),
    );
  }

  // Quita un producto individual de un pedido que sigue en 'pendiente'
  // (carrito de mesa o de domicilio). El id es el de la fila en
  // orden_items, no el de la orden completa.
  @Delete('item/:id')
  async eliminarItem(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.ordersService.eliminarItemOrden(
      Number(id),
      this.requester(user),
    );
  }

  @Patch('cancelar/:id')
  async cancelarOrden(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.ordersService.cancelarOrden(id, this.requester(user));
  }

  // NUEVO: Endpoint para el panel de administración (solo admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get('admin/recent')
  async getRecentOrdersForAdmin() {
    return await this.ordersService.getRecentOrdersForAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get('admin/stream')
  async streamOrdersForAdmin(@Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const orders = await this.ordersService.getRecentOrdersForAdmin();
    res.write(`data: ${JSON.stringify(orders)}\n\n`);

    const interval = setInterval(() => {
      void (async () => {
        const updated = await this.ordersService.getRecentOrdersForAdmin();
        res.write(`data: ${JSON.stringify(updated)}\n\n`);
      })();
    }, 30000);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
}
