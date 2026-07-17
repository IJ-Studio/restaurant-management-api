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

export class ActualizarDireccionDto {
  @IsString()
  @IsOptional()
  alias?: string;

  @IsString()
  @IsOptional()
  linea1?: string;

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
  @IsOptional()
  @Length(5, 5, { message: 'El código postal debe tener exactamente 5 dígitos.' })
  codigoPostal?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  estado?: string;

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

  // Si el cliente ya tiene un perfil de facturación guardado, solo manda
  // este ID y el resto de los campos fiscales se vuelve opcional.
  @IsUUID()
  @IsOptional()
  perfilFacturacionId?: string;

  @IsString()
  @IsOptional()
  @Length(12, 13, { message: 'El RFC debe tener 12 (persona moral) o 13 (persona física) caracteres.' })
  rfc?: string;

  @IsString()
  @IsOptional()
  razonSocial?: string;

  @IsString()
  @IsOptional()
  usoCfdi?: string;

  @IsString()
  @IsOptional()
  regimenFiscal?: string;

  @IsString()
  @IsOptional()
  @Length(5, 5, { message: 'El código postal fiscal debe tener exactamente 5 dígitos.' })
  codigoPostalFiscal?: string;

  @IsString()
  @IsOptional()
  email?: string;

  // Si manda datos fiscales manuales (sin perfilFacturacionId) y quiere
  // guardarlos como perfil reusable para la próxima vez.
  @IsBoolean()
  @IsOptional()
  guardarComoPerfil?: boolean;
}

export class GuardarPerfilFacturacionDto {
  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

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

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;
}
