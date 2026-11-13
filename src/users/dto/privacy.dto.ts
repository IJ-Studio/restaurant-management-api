import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CONSENT_ORIGINS,
  type ConsentOrigin,
} from '../../database/schema/consentimientos.schema';

export class PrivacyNoticeDto {
  @ApiProperty({ description: 'true al aceptar el aviso; false al retirarlo' })
  @IsBoolean({ message: 'Indica si aceptas el aviso de privacidad' })
  readonly aceptado!: boolean;

  @ApiProperty({ example: '2026-11', description: 'Versión del aviso leído' })
  @IsString()
  @IsNotEmpty({ message: 'Falta la versión del aviso de privacidad' })
  @MaxLength(20)
  readonly version!: string;
}

/** Contrato de `PUT /profile/privacidad`: solo se registran los campos enviados. */
export class UpdatePrivacyDto {
  @ApiProperty({ enum: CONSENT_ORIGINS })
  @IsIn(CONSENT_ORIGINS, { message: 'El origen debe ser movil o web' })
  readonly origen!: ConsentOrigin;

  @ApiPropertyOptional({ type: PrivacyNoticeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyNoticeDto)
  readonly avisoPrivacidad?: PrivacyNoticeDto;

  @ApiPropertyOptional({ description: 'false = no recibir notificaciones' })
  @IsOptional()
  @IsBoolean()
  readonly notificacionesPush?: boolean;

  @ApiPropertyOptional({ description: 'false = no enviar reportes de errores' })
  @IsOptional()
  @IsBoolean()
  readonly reportesErrores?: boolean;
}

/** Contrato de `DELETE /account`: la contraseña confirma que quien borra es el titular. */
export class DeleteAccountDto {
  @ApiProperty({ description: 'Contraseña actual del titular de la cuenta' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu contraseña para eliminar la cuenta' })
  @MaxLength(64)
  readonly password!: string;
}
