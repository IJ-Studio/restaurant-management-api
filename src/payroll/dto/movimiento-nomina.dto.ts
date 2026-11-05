import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { TextoNegocio } from '../../common/normalizacion/normalizar';

export const TIPOS_MOVIMIENTO = ['suma', 'resta'] as const;
/** Conceptos que el admin puede elegir; `correccion` lo pone solo el API al corregir. */
export const CONCEPTOS_MOVIMIENTO = [
  'bono',
  'horas_extra',
  'propina',
  'reembolso',
  'objeto_roto',
  'danio',
  'reparacion',
  'consumo',
  'anticipo',
  'faltante_caja',
  'otro',
] as const;

/** Cuerpo de `POST /payroll/movimientos`. */
export class CrearMovimientoNominaDto {
  @IsUUID()
  readonly empleadoId!: string;

  @IsIn(TIPOS_MOVIMIENTO)
  readonly tipo!: (typeof TIPOS_MOVIMIENTO)[number];

  @IsIn(CONCEPTOS_MOVIMIENTO)
  readonly concepto!: (typeof CONCEPTOS_MOVIMIENTO)[number];

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  readonly monto!: number;

  @IsDateString({ strict: true })
  readonly periodoInicio!: string;

  @IsDateString({ strict: true })
  readonly periodoFin!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  readonly fecha?: string;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @MinLength(5, { message: 'Explica el motivo (al menos 5 letras).' })
  @MaxLength(500)
  readonly justificacion!: string;
}

/** Cuerpo de `POST /payroll/movimientos/:id/corregir`. */
export class CorregirMovimientoNominaDto {
  @TextoNegocio({ obligatorio: true })
  @IsString()
  @MinLength(5, { message: 'Explica por qué se corrige (al menos 5 letras).' })
  @MaxLength(500)
  readonly justificacion!: string;
}
