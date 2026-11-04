import { IsIn, IsString, Length, Matches } from 'class-validator';
import { TextoNegocio } from '../common/normalizacion/normalizar';

export const TIPOS_REPORTE = [
  'no-funciona',
  'dato-incorrecto',
  'accesibilidad',
  'otro',
] as const;

/** Body de `POST /reportes-problemas` (D-34): sin datos personales. */
export class CrearReporteDto {
  @IsIn(TIPOS_REPORTE)
  readonly tipo!: (typeof TIPOS_REPORTE)[number];

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @Length(10, 1000)
  readonly descripcion!: string;

  /** Pantalla donde pasó: una ruta del sitio, no una URL ajena. */
  @IsString()
  @Length(1, 300)
  @Matches(/^\/[^\s]*$/, { message: 'ruta debe ser una ruta del sitio' })
  readonly ruta!: string;
}
