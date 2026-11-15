import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { NombrePersona, TelefonoValido } from '../../common/validacion/campos';
import { Telefono, TextoNegocio } from '../../common/normalizacion/normalizar';

/**
 * Campos editables de un perfil con `PATCH /users/:id`.
 * Rol, contraseña y estado se cambian en endpoints aparte: aquí no se aceptan.
 */
export class UpdateUserDto {
  @TextoNegocio({ obligatorio: true })
  @ApiPropertyOptional({ example: 'Ana', maxLength: 50 })
  @IsOptional()
  @IsNotEmpty()
  @NombrePersona()
  readonly name?: string;

  @TextoNegocio({ obligatorio: true })
  @ApiPropertyOptional({ example: 'López', maxLength: 50 })
  @IsOptional()
  @IsNotEmpty()
  @NombrePersona()
  readonly lastname?: string;

  @Telefono({ obligatorio: true })
  @ApiPropertyOptional({
    example: '+525512345678',
    description:
      'Teléfono en formato internacional (E.164): "+" y de 10 a 15 dígitos, sin espacios',
  })
  @IsOptional()
  @TelefonoValido()
  readonly phone?: string;
}
