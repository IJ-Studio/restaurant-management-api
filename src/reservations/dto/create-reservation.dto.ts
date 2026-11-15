import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  Length,
} from 'class-validator';
import {
  CorreoValido,
  LIMITES,
  NombrePersona,
  TelefonoValido,
  TextoMax,
} from '../../common/validacion/campos';
import {
  Correo,
  Telefono,
  TextoNegocio,
} from '../../common/normalizacion/normalizar';

export class CreateReservationDto {
  @TextoNegocio({ obligatorio: true })
  @NombrePersona(
    2,
    LIMITES.nombreCompleto,
    'Escribe el nombre de quien reserva: solo letras, espacios, guion o apóstrofo (2 a 120).',
  )
  clienteNombre: string;

  @Telefono({ obligatorio: true })
  @TelefonoValido()
  clienteTelefono: string;

  @Correo()
  @CorreoValido()
  clienteEmail: string;

  @IsDateString({}, { message: 'Fecha inválida' })
  fechaHora: string; // ISO 8601

  @IsInt({ message: 'Número de comensales debe ser entero' })
  @Min(1, { message: 'Debe haber al menos 1 comensal' })
  @Max(50, { message: 'Máximo 50 comensales' })
  numComensales: number;

  @IsOptional()
  @IsInt({ message: 'Mesa ID debe ser entero' })
  mesaId?: number;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Peticiones especiales muy largas' })
  peticionesEspeciales?: string;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @TextoMax(LIMITES.ocasion)
  ocasion?: string;

  @IsOptional()
  @IsString()
  @TextoMax(20)
  canal?: string; // 'web', 'telefono', etc. (por defecto 'web')
}
