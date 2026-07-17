import {Controller,Post,Get,Put,Delete,Body,Query,Param,Req,Res,Headers,BadRequestException,} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PagosService } from './pagos.service';
import { Public } from '../auth/decorators/public.decorator';
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

  @Public()
  @Post('direcciones')
  async crearDireccion(@Body() dto: CrearDireccionDto) {
    return await this.pagosService.crearDireccion(dto);
  }

  @Public()
  @Get('direcciones')
  async listarDirecciones(@Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.listarDirecciones(Number(usuarioId));
  }

  @Public()
  @Put('direcciones/:id')
  async actualizarDireccion(
    @Param('id') id: string,
    @Query('usuarioId') usuarioId: string,
    @Body() dto: ActualizarDireccionDto,
  ) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.actualizarDireccion(Number(id), Number(usuarioId), dto);
  }

  @Public()
  @Delete('direcciones/:id')
  async eliminarDireccion(@Param('id') id: string, @Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.eliminarDireccion(Number(id), Number(usuarioId));
  }

  // ── MÉTODOS DE PAGO GUARDADOS ────────────────────────────────────

  @Public()
  @Post('metodos-pago/setup-intent')
  async crearSetupIntent(@Body('usuarioId') usuarioId: number) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.crearSetupIntent(usuarioId);
  }

  @Public()
  @Post('metodos-pago')
  async guardarMetodoPago(@Body() dto: GuardarMetodoPagoDto) {
    return await this.pagosService.guardarMetodoPago(dto);
  }

  @Public()
  @Get('metodos-pago')
  async listarMetodosPago(@Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.listarMetodosPago(Number(usuarioId));
  }

  @Public()
  @Delete('metodos-pago/:id')
  async eliminarMetodoPago(@Param('id') id: string, @Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.eliminarMetodoPago(id, Number(usuarioId));
  }

  // ── PAGOS ─────────────────────────────────────────────────────

  @Public()
  @Post('pagos/crear-intento')
  async crearIntentoPago(@Body() dto: CrearIntentoPagoDto) {
    return await this.pagosService.crearIntentoPago(dto);
  }

  // IMPORTANTE: esta ruta necesita el body SIN parsear (raw) para poder
  // validar la firma de Stripe. Ver instrucciones de main.ts — por eso
  // aquí se usa @Req() en vez de @Body().
  @Public()
  @Post('pagos/webhook')
  async webhookStripe(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    return await this.pagosService.manejarWebhookStripe(req.body, signature);
  }

  // ── PERFILES DE FACTURACIÓN ──────────────────────────────────

  @Public()
  @Post('perfiles-facturacion')
  async guardarPerfilFacturacion(@Body() dto: GuardarPerfilFacturacionDto) {
    return await this.pagosService.guardarPerfilFacturacion(dto);
  }

  @Public()
  @Get('perfiles-facturacion')
  async listarPerfilesFacturacion(@Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.listarPerfilesFacturacion(Number(usuarioId));
  }

  @Public()
  @Delete('perfiles-facturacion/:id')
  async eliminarPerfilFacturacion(@Param('id') id: string, @Query('usuarioId') usuarioId: string) {
    if (!usuarioId) throw new BadRequestException('El parámetro usuarioId es requerido.');
    return await this.pagosService.eliminarPerfilFacturacion(id, Number(usuarioId));
  }

  // ── FACTURACIÓN ───────────────────────────────────────────────

  @Public()
  @Post('facturas')
  async crearFactura(@Body() dto: CrearFacturaDto) {
    return await this.pagosService.crearFactura(dto);
  }

  @Public()
  @Get('facturas/:ordenId')
  async obtenerFactura(@Param('ordenId') ordenId: string) {
    return await this.pagosService.obtenerFacturaPorOrden(ordenId);
  }

  @Public()
  @Get('facturas/:ordenId/descargar')
  async descargarFactura(
    @Param('ordenId') ordenId: string,
    @Query('tipo') tipo: 'pdf' | 'xml' = 'pdf',
    @Res() res: Response,
  ) {
    const archivo = await this.pagosService.descargarFacturaArchivo(ordenId, tipo);
    res.setHeader(
      'Content-Type',
      tipo === 'pdf' ? 'application/pdf' : 'application/xml',
    );
    res.setHeader('Content-Disposition', `attachment; filename=factura-${ordenId}.${tipo}`);
    res.send(archivo);
  }
}
