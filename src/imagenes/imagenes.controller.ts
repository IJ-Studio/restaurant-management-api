import { createHash } from 'node:crypto';
import {
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createStrictValidationPipe } from '../common/config/validation.config';
import { ROLES } from '../common/constants/roles';

/** Carpeta fija de Cloudinary por destino: quien sube no elige dónde. */
const CARPETAS = {
  platillos: 'ElQuijote/menu',
  promociones: 'ElQuijote/promociones',
  landing: 'ElQuijote/landing',
} as const;

export class FirmaImagenDto {
  @IsIn(Object.keys(CARPETAS))
  readonly destino!: keyof typeof CARPETAS;
}

/** Firma de Cloudinary: SHA-1 de los parámetros ordenados más el secreto (sin dependencias). */
export function firmarCloudinary(
  parametros: Record<string, string | number>,
  secreto: string,
): string {
  const cadena = Object.keys(parametros)
    .sort()
    .map((k) => `${k}=${parametros[k]}`)
    .join('&');
  return createHash('sha1')
    .update(cadena + secreto)
    .digest('hex');
}

/**
 * Subida firmada de imágenes (D-31). El navegador valida el archivo, pide aquí una firma de
 * corta vida para una carpeta fija y sube directo a Cloudinary; el secreto nunca sale del API.
 */
@Controller('imagenes')
@UseGuards(RolesGuard)
@Roles(ROLES.ADMIN)
export class ImagenesController {
  @Post('firma')
  firma(@Body(createStrictValidationPipe()) dto: FirmaImagenDto) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secreto = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secreto) {
      throw new ServiceUnavailableException(
        'La subida de imágenes no está configurada.',
      );
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = CARPETAS[dto.destino];
    return {
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature: firmarCloudinary({ folder, timestamp }, secreto),
    };
  }
}
