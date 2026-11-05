import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  Length,
} from 'class-validator';
import {
  Correo,
  Texto,
  TextoNegocio,
} from '../../common/normalizacion/normalizar';

export class CrearDireccionDto {
  @TextoNegocio()
  @IsString()
  @IsOptional()
  alias?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  linea1: string;

  @TextoNegocio()
  @IsString()
  @IsOptional()
  linea2?: string;

  @TextoNegocio()
  @IsString()
  @IsOptional()
  colonia?: string;

  @TextoNegocio()
  @IsString()
  @IsOptional()
  referencias?: string;

  @Texto({ obligatorio: true })
  @IsString()
  @Length(5, 5, {
    message: 'El código postal debe tener exactamente 5 dígitos.',
  })
  codigoPostal: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;
}

export class ActualizarDireccionDto {
  @TextoNegocio()
  @IsString()
  @IsOptional()
  alias?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsOptional()
  linea1?: string;

  @TextoNegocio()
  @IsString()
  @IsOptional()
  linea2?: string;

  @TextoNegocio()
  @IsString()
  @IsOptional()
  colonia?: string;

  @TextoNegocio()
  @IsString()
  @IsOptional()
  referencias?: string;

  @Texto({ obligatorio: true })
  @IsString()
  @IsOptional()
  @Length(5, 5, {
    message: 'El código postal debe tener exactamente 5 dígitos.',
  })
  codigoPostal?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsOptional()
  ciudad?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsOptional()
  estado?: string;

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;
}

export class GuardarMetodoPagoDto {
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
  @IsUUID()
  @IsNotEmpty()
  ordenId: string;

  // Si el cliente ya tiene un perfil de facturación guardado, solo manda
  // este ID y el resto de los campos fiscales se vuelve opcional.
  @IsUUID()
  @IsOptional()
  perfilFacturacionId?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsOptional()
  @Length(12, 13, {
    message:
      'El RFC debe tener 12 (persona moral) o 13 (persona física) caracteres.',
  })
  rfc?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsOptional()
  razonSocial?: string;

  @Texto({ obligatorio: true })
  @IsString()
  @IsOptional()
  usoCfdi?: string;

  @Texto({ obligatorio: true })
  @IsString()
  @IsOptional()
  regimenFiscal?: string;

  @Texto({ obligatorio: true })
  @IsString()
  @IsOptional()
  @Length(5, 5, {
    message: 'El código postal fiscal debe tener exactamente 5 dígitos.',
  })
  codigoPostalFiscal?: string;

  @Correo()
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
  @TextoNegocio({ obligatorio: true })
  @IsString()
  @Length(12, 13, {
    message:
      'El RFC debe tener 12 (persona moral) o 13 (persona física) caracteres.',
  })
  rfc: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @Texto({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  usoCfdi: string;

  @Texto({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  regimenFiscal: string;

  @Texto({ obligatorio: true })
  @IsString()
  @Length(5, 5, {
    message: 'El código postal fiscal debe tener exactamente 5 dígitos.',
  })
  codigoPostalFiscal: string;

  @Correo()
  @IsString()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean;
}
