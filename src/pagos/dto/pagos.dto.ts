import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  Length,
} from 'class-validator';

export class CrearDireccionDto {
  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

  @IsString()
  @IsOptional()
  alias?: string;

  @IsString()
  @IsNotEmpty()
  linea1: string;

  @IsString()
  @IsOptional()
  linea2?: string;

  @IsString()
  @IsOptional()
  colonia?: string;

  @IsString()
  @IsOptional()
  referencias?: string;

  @IsString()
  @Length(5, 5, { message: 'El código postal debe tener exactamente 5 dígitos.' })
  codigoPostal: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;
}

export class GuardarMetodoPagoDto {
  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

  // Este es el token que Stripe regresa DESPUÉS de haber capturado la
  // tarjeta directo en el navegador del cliente (stripe.confirmCardSetup).
  // Nunca es el número de tarjeta ni el CVC.
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;
}

export class CrearIntentoPagoDto {
  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

  @IsUUID()
  @IsNotEmpty()
  ordenId: string;

  // Si el cliente eligió una tarjeta ya guardada.
  @IsUUID()
  @IsOptional()
  metodoPagoGuardadoId?: string;

  // Si el cliente está pagando con una tarjeta nueva (ya tokenizada por
  // Stripe.js en el frontend, pero sin guardarla para el futuro).
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  // Dirección a la que se envía este pedido (opcional: si ya se guardó
  // antes en la orden, no hace falta volver a mandarla).
  @IsNumber()
  @IsOptional()
  direccionId?: number;
}

export class CrearFacturaDto {
  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

  @IsUUID()
  @IsNotEmpty()
  ordenId: string;

  @IsString()
  @Length(12, 13, { message: 'El RFC debe tener 12 (persona moral) o 13 (persona física) caracteres.' })
  rfc: string;

  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @IsString()
  @IsNotEmpty()
  usoCfdi: string;

  @IsString()
  @IsNotEmpty()
  regimenFiscal: string;

  @IsString()
  @Length(5, 5, { message: 'El código postal fiscal debe tener exactamente 5 dígitos.' })
  codigoPostalFiscal: string;

  @IsString()
  @IsOptional()
  email?: string;
}
