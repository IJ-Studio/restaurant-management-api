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
}
