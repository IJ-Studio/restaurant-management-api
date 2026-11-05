import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { TextoNegocio } from '../common/normalizacion/normalizar';

/** Formas que ya usa el mapa de reservaciones. */
export const FORMAS_MESA = [
  'cuadrada',
  'redonda',
  'rectangular',
  'barra',
] as const;

/**
 * Mesa del salón (Prioridad 1.3). Todo opcional en el DTO: en el alta, el servicio exige número y
 * capacidad (una subclase heredaría el `@IsOptional` y no los exigiría). `nombre` y `areaId`
 * aceptan null para quitarlos.
 */
export class MesaDto {
  @TextoNegocio({ obligatorio: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  readonly numero?: string;

  @TextoNegocio()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(50)
  readonly nombre?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  readonly capacidad?: number;

  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  readonly areaId?: number | null;

  @IsOptional()
  @IsIn(FORMAS_MESA)
  readonly forma?: (typeof FORMAS_MESA)[number];

  @IsOptional()
  @IsBoolean()
  readonly activa?: boolean;
}
