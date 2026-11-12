import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import { Texto, TextoNegocio } from '../common/normalizacion/normalizar';

const noNulo = (_: object, v: unknown) => v !== null;

/**
 * Campos comunes del alta y la edición (snake_case, como los manda la web). El título va aparte
 * en cada clase: heredar su `@IsOptional` dejaría crear promociones sin título.
 */
class CamposPromocion {
  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly descripcion?: string | null;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly badge?: string | null;

  @Texto()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9 -]{0,80}$/, { message: 'Color no válido.' })
  readonly color?: string | null;

  @IsOptional()
  @ValidateIf(noNulo)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly precio_original?: number | null;

  @IsOptional()
  @ValidateIf(noNulo)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly precio_descuento?: number | null;

  @IsOptional()
  @ValidateIf(noNulo)
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    host_whitelist: ['res.cloudinary.com'],
  })
  readonly imagen_url?: string | null;

  @IsOptional()
  @ValidateIf(noNulo)
  @IsString()
  @MaxLength(255)
  readonly imagen_public_id?: string | null;

  @IsOptional()
  @IsBoolean()
  readonly activa?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly orden?: number;

  @IsOptional()
  @ValidateIf(noNulo)
  @IsDateString({ strict: true })
  readonly fecha_inicio?: string | null;

  @IsOptional()
  @ValidateIf(noNulo)
  @IsDateString({ strict: true })
  readonly fecha_fin?: string | null;
}

/** Cuerpo de `PATCH /promociones/:id`: todo opcional. */
export class ActualizarPromocionDto extends CamposPromocion {
  @TextoNegocio({ obligatorio: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly titulo?: string;
}

/** Cuerpo de `POST /promociones`: el título es obligatorio. */
export class CrearPromocionDto extends CamposPromocion {
  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly titulo!: string;
}
