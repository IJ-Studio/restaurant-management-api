import {
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityQueryDto {
  @IsDateString({}, { message: 'Fecha inválida' })
  fecha: string;

  @IsString({ message: 'Hora inválida' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Formato de hora HH:MM',
  })
  hora: string;

  @IsInt({ message: 'Número de comensales debe ser entero' })
  @Min(1)
  @Max(50)
  @Type(() => Number)
  numComensales: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  @Type(() => Number)
  duracionMin?: number;
}

/** `GET /reservations/horas`: horas de un día del restaurante para N personas. */
export class HorasQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Elige una fecha válida.' })
  fecha: string;

  @Type(() => Number)
  @IsInt({ message: 'El número de personas debe ser de 1 a 50.' })
  @Min(1, { message: 'El número de personas debe ser de 1 a 50.' })
  @Max(50, { message: 'El número de personas debe ser de 1 a 50.' })
  numComensales: number;
}
