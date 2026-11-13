import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import {
  interval,
  map,
  merge,
  of,
  takeUntil,
  timer,
  type Observable,
} from 'rxjs';
import { OrdersService, type OrderRequester } from './orders.service';
import { OrderWorkflowService } from './order-workflow.service';
import { OrderEventsService, type OrderChange } from './order-events.service';
import { CreateOrderMesaDto } from './dto/create-order-mesa.dto';
import { ChargeOrderDto } from './dto/charge-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { createStrictValidationPipe } from '../common/config/validation.config';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guards';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser } from '../auth/decorators/active-user.decorator';
import { ROLES } from '../common/constants/roles';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';

/** Latido del flujo: los proxies cortan las conexiones que pasan mucho tiempo sin transmitir. */
export const STREAM_HEARTBEAT_MS = 25_000;
/** El flujo se cierra solo y el cliente reconecta: así la sesión se vuelve a validar. */
export const STREAM_MAX_MS = 15 * 60_000;

@Controller('pedidos')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly workflow: OrderWorkflowService,
    private readonly events: OrderEventsService,
  ) {}

  /** Avisa por el flujo en tiempo real y devuelve la respuesta tal cual. */
  private changed<T>(
    change: OrderChange,
    orderId: string | undefined,
    result: T,
    estatus?: string,
  ): T {
    if (orderId) this.events.emit(change, orderId, estatus);
    return result;
  }

  /**
   * Tiempo real de pedidos para el personal (HU-06), por Server-Sent Events. Emite `ready` al
   * conectar, `order` en cada cambio y `ping` como latido. Solo viaja el id del pedido y el tipo
   * de cambio. Va antes de `:id` para que esa ruta no la capture.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
  @Sse('stream')
  streamOrders(): Observable<MessageEvent> {
    return merge(
      of({ type: 'ready', data: {} }),
      this.events
        .stream()
        .pipe(map((event) => ({ type: 'order', data: event }))),
      interval(STREAM_HEARTBEAT_MS).pipe(
        map(() => ({ type: 'ping', data: {} })),
      ),
    ).pipe(takeUntil(timer(STREAM_MAX_MS)));
  }

  private requester(user: ActiveUserData): OrderRequester {
    return { id: Number(user.id), roleId: user.roleId };
  }

  @Post('mesa')
  async createOrderMesa(
    @Body() createOrderMesaDto: CreateOrderMesaDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    const result = await this.ordersService.createOrderMesa(
      createOrderMesaDto,
      Number(user.id),
      user.roleId,
    );
    return this.changed('items', result.ordenId, result);
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
    const result = await this.ordersService.confirmarOrdenMesa(
      id,
      this.requester(user),
    );
    return this.changed('sent', id, result);
  }

  // Quita un producto individual de un pedido que sigue en 'pendiente'
  // (carrito de mesa o de domicilio). El id es el de la fila en
  // orden_items, no el de la orden completa.
  @Delete('item/:id')
  async eliminarItem(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    const result = await this.ordersService.eliminarItemOrden(
      Number(id),
      this.requester(user),
    );
    return this.changed('items', result.ordenId, result);
  }

  @Patch('cancelar/:id')
  async cancelarOrden(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body(createStrictValidationPipe()) dto: CancelOrderDto,
  ) {
    const result = await this.ordersService.cancelarOrden(
      id,
      this.requester(user),
      dto.motivo,
    );
    return this.changed('cancelled', id, result);
  }

  // Pedidos activos del día: panel de administración y app móvil del personal
  // (cajero, mesero y cocina los consultan en la pestaña Pedidos). Solo lectura.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
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

  // ── App móvil del personal: flujo del pedido en el restaurante ──────────────

  // Métodos con los que caja puede cobrar (sin la pasarela en línea).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO)
  @Get('metodos-pago')
  async listarMetodosPago() {
    return await this.workflow.listarMetodosPago();
  }

  // Cocina: abierta → en_preparacion → lista. Piso: lista → entregada.
  // El servicio valida el paso y el rol.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
  @Patch(':id/estatus')
  async cambiarEstatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(createStrictValidationPipe()) dto: UpdateOrderStatusDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    const result = await this.workflow.cambiarEstatus(
      id,
      dto.estatus,
      this.requester(user),
    );
    return this.changed('status', id, result, dto.estatus);
  }

  // Cobro en caja (efectivo o terminal física). El monto sale de la orden.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO)
  @Post(':id/cobrar')
  async cobrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(createStrictValidationPipe()) dto: ChargeOrderDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    const result = await this.workflow.cobrar(id, dto, Number(user.id));
    return this.changed('charged', id, result);
  }

  // Detalle de un pedido. Va al final: `:id` no debe capturar las rutas fijas de arriba.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERO, ROLES.COCINA)
  @Get(':id')
  async obtenerDetalle(@Param('id', ParseUUIDPipe) id: string) {
    return await this.workflow.obtenerDetalle(id);
  }
}
