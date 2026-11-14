import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { TextoNegocio } from '../common/normalizacion/normalizar';

/** Solo la nube del restaurante (D-18): nada de terceros. */
export const URL_CLOUDINARY =
  /^https:\/\/res\.cloudinary\.com\/dcb1tspbj\/image\/upload\/[^\s"'<>]+$/;
const TELEFONO = /^\+?[0-9][0-9 ()-]{8,18}[0-9]$/;

export class ImagenSitioDto {
  @IsString()
  @Matches(URL_CLOUDINARY, {
    message: 'La imagen debe estar en la nube del restaurante.',
  })
  readonly url!: string;

  @IsString()
  @MaxLength(200)
  readonly publicId!: string;

  @IsString()
  @MaxLength(150)
  readonly alt!: string;
}

/** Textos de la landing; vacío o ausente = el texto de la web. */
export class TextosSitioDto {
  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'El titular admite hasta 80 caracteres.' })
  readonly titulo?: string | null;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'La entradilla admite hasta 200 caracteres.' })
  readonly subtitulo?: string | null;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(600, { message: '«Nosotros» admite hasta 600 caracteres.' })
  readonly nosotros?: string | null;
}

export class SitioDto {
  @IsArray()
  @ArrayMaxSize(5, { message: 'La portada admite hasta 5 imágenes.' })
  @ValidateNested({ each: true })
  @Type(() => ImagenSitioDto)
  readonly portada!: ImagenSitioDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagenSitioDto)
  readonly login?: ImagenSitioDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImagenSitioDto)
  readonly registro?: ImagenSitioDto | null;

  /** Color que se ve mientras carga la foto (o si falla). */
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'El color debe ser hexadecimal (#RRGGBB).',
  })
  readonly colorRespaldo!: string;

  @IsString()
  @Matches(TELEFONO, {
    message: 'Escribe un teléfono válido (10 dígitos o con lada).',
  })
  readonly telefono!: string;

  @IsOptional()
  @IsString()
  @Matches(TELEFONO, {
    message: 'Escribe un WhatsApp válido (10 dígitos o con lada).',
  })
  readonly whatsapp?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TextosSitioDto)
  readonly textos?: TextosSitioDto | null;
}
