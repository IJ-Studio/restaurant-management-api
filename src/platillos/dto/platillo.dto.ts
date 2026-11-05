import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TextoNegocio } from '../../common/normalizacion/normalizar';

/** Etiquetas de la web; cada una corresponde a una columna booleana de `platillos`. */
export const ETIQUETAS_PLATILLO = {
  popular: 'esPopular',
  vegano: 'esVegano',
  picante: 'esPicante',
  nuevo: 'esNuevo',
  'sin-gluten': 'esSinGluten',
} as const;

/** Body de `PATCH /platillos/:id` (admin). Mismos nombres que `export.json` y la web. */
export class ActualizarPlatilloDto {
  @TextoNegocio({ obligatorio: true })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  readonly nombre?: string;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly descripcion_corta?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  readonly precio?: number;

  @IsOptional()
  @IsBoolean()
  readonly disponible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  readonly tiempo_preparacion?: number;

  /** Solo imágenes de la nube de la casa (la web sube con firma a Cloudinary). */
  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    host_whitelist: ['res.cloudinary.com'],
  })
  @MaxLength(500)
  readonly imagen_url?: string | null;

  /** La web lo envía; la tabla no tiene la columna (se deduce de la URL), así que se acepta y se ignora. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly imagen_public_id?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(Object.keys(ETIQUETAS_PLATILLO), { each: true })
  readonly tags?: string[];
}

/**
 * Body de `POST /platillos` (admin). No hereda del de edición: el `@IsOptional` heredado dejaría
 * pasar un alta sin nombre ni precio.
 */
export class CrearPlatilloDto {
  @IsInt()
  @Min(1)
  readonly categoria_id!: number;

  @TextoNegocio({ obligatorio: true })
  @IsString()
  @Length(1, 150)
  readonly nombre!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  readonly precio!: number;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly descripcion_corta?: string;

  @IsOptional()
  @IsBoolean()
  readonly disponible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  readonly tiempo_preparacion?: number;

  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    host_whitelist: ['res.cloudinary.com'],
  })
  @MaxLength(500)
  readonly imagen_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly imagen_public_id?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(Object.keys(ETIQUETAS_PLATILLO), { each: true })
  readonly tags?: string[];
}
