import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PagosService } from './pagos.service';
import { Public } from '../auth/decorators/public.decorator';
import { ActiveUser } from '../auth/decorators/active-user.decorator';
import type { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import {
  CrearDireccionDto,
  ActualizarDireccionDto,
  GuardarMetodoPagoDto,
  CrearIntentoPagoDto,
  CrearFacturaDto,
  GuardarPerfilFacturacionDto,
} from './dto/pagos.dto';

@Controller()
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  // ── DIRECCIONES ────────────────────────────────────────────────

  @Post('direcciones')
  async crearDireccion(
    @Body() dto: CrearDireccionDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.crearDireccion(dto, Number(user.id));
  }

  @Get('direcciones')
  async listarDirecciones(@ActiveUser() user: ActiveUserData) {
    return await this.pagosService.listarDirecciones(Number(user.id));
  }

  @Put('direcciones/:id')
  async actualizarDireccion(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
    @Body() dto: ActualizarDireccionDto,
  ) {
    return await this.pagosService.actualizarDireccion(
      Number(id),
      Number(user.id),
      dto,
    );
  }

  @Delete('direcciones/:id')
  async eliminarDireccion(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.eliminarDireccion(
      Number(id),
      Number(user.id),
    );
  }

  // ── MÉTODOS DE PAGO GUARDADOS ────────────────────────────────────

  @Post('metodos-pago/setup-intent')
  async crearSetupIntent(@ActiveUser() user: ActiveUserData) {
    return await this.pagosService.crearSetupIntent(Number(user.id));
  }

  @Post('metodos-pago')
  async guardarMetodoPago(
    @Body() dto: GuardarMetodoPagoDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.guardarMetodoPago(dto, Number(user.id));
  }

  @Get('metodos-pago')
  async listarMetodosPago(@ActiveUser() user: ActiveUserData) {
    return await this.pagosService.listarMetodosPago(Number(user.id));
  }

  @Delete('metodos-pago/:id')
  async eliminarMetodoPago(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.eliminarMetodoPago(id, Number(user.id));
  }

  // ── PAGOS ─────────────────────────────────────────────────────

  @Post('pagos/crear-intento')
  async crearIntentoPago(
    @Body() dto: CrearIntentoPagoDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.crearIntentoPago(
      dto,
      Number(user.id),
      user.roleId,
    );
  }

  // IMPORTANTE: esta ruta necesita el body SIN parsear (raw) para poder
  // validar la firma de Stripe. Ver instrucciones de main.ts — por eso
  // aquí se usa @Req() en vez de @Body().
  @Public()
  @Post('pagos/webhook')
  async webhookStripe(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    return await this.pagosService.manejarWebhookStripe(
      req.body as Buffer,
      signature,
    );
  }

  // ── PERFILES DE FACTURACIÓN ──────────────────────────────────

  @Post('perfiles-facturacion')
  async guardarPerfilFacturacion(
    @Body() dto: GuardarPerfilFacturacionDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.guardarPerfilFacturacion(
      dto,
      Number(user.id),
    );
  }

  @Get('perfiles-facturacion')
  async listarPerfilesFacturacion(@ActiveUser() user: ActiveUserData) {
    return await this.pagosService.listarPerfilesFacturacion(Number(user.id));
  }

  @Delete('perfiles-facturacion/:id')
  async eliminarPerfilFacturacion(
    @Param('id') id: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.eliminarPerfilFacturacion(
      id,
      Number(user.id),
    );
  }

  // ── FACTURACIÓN ───────────────────────────────────────────────

  @Post('facturas')
  async crearFactura(
    @Body() dto: CrearFacturaDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.crearFactura(dto, Number(user.id));
  }

  @Get('facturas/:ordenId')
  async obtenerFactura(
    @Param('ordenId') ordenId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.pagosService.obtenerFacturaPorOrden(
      ordenId,
      Number(user.id),
    );
  }

  @Get('facturas/:ordenId/descargar')
  async descargarFactura(
    @Param('ordenId') ordenId: string,
    @Query('tipo') tipo: 'pdf' | 'xml' = 'pdf',
    @ActiveUser() user: ActiveUserData,
    @Res() res: Response,
  ) {
    const archivo = await this.pagosService.descargarFacturaArchivo(
      ordenId,
      tipo,
      Number(user.id),
    );
    res.setHeader(
      'Content-Type',
      tipo === 'pdf' ? 'application/pdf' : 'application/xml',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=factura-${ordenId}.${tipo}`,
    );
    res.send(archivo);
  }
}
