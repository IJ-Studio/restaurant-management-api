import { IsString, IsEmail, IsInt, Min, Max, IsOptional, IsDateString, IsBoolean, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @IsString({ message: 'El nombre es obligatorio' })
  @Length(2, 150, { message: 'El nombre debe tener entre 2 y 150 caracteres' })
  clienteNombre: string;

  @IsString({ message: 'El teléfono es obligatorio' })
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Teléfono inválido' })
  clienteTelefono: string;

  @IsEmail({}, { message: 'Email inválido' })
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

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Peticiones especiales muy largas' })
  peticionesEspeciales?: string;

  @IsOptional()
  @IsString()
  ocasion?: string;

  @IsOptional()
  @IsString()
  canal?: string; // 'web', 'telefono', etc. (por defecto 'web')
}
