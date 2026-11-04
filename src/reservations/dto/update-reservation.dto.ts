import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { TextoNegocio } from '../../common/normalizacion/normalizar';

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'], {
    message: 'Estado inválido',
  })
  estatus?: string;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  notas?: string;

  /** Obligatorio cuando `estatus` es `cancelada` (lo comprueba el servicio). */
  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoCancelacion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  numComensales?: number;

  @IsOptional()
  @IsDateString()
  fechaHora?: string;

  @IsOptional()
  @IsInt()
  mesaId?: number;

  @IsOptional()
  @IsBoolean()
  recordatorioEnviado?: boolean;
}
