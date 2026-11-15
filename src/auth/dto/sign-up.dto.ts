import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength } from 'class-validator';
import {
  ContrasenaNueva,
  CorreoValido,
  LIMITES,
  NombrePersona,
  TelefonoValido,
} from '../../common/validacion/campos';

import { Match } from '../../common/decorators/match.decorator';
import {
  Correo,
  Telefono,
  TextoNegocio,
} from '../../common/normalizacion/normalizar';

/**
 * Contrato de POST /auth/sign-up. La fuente de verdad de las reglas es este DTO: el formulario
 * de registro del web (restaurant-management-web) debe aceptar un subconjunto de lo que se
 * permite aquí, nunca más.
 *
 * Los límites de longitud respetan las columnas de `users` (name/lastname 50, email 100,
 * phone 20). Antes eran mayores y el INSERT fallaba, mostrando un "el email ya existe" falso.
 *
 * Este DTO NO acepta `roleId`, `verified` ni `loginAttempts`: el servicio siempre asigna rol
 * de cliente y `verified = false`, así que recibirlos solo invitaba a la asignación masiva. Con
 * `forbidNonWhitelisted` ahora se rechazan con 400.
 */
export class SignUpDto {
  @TextoNegocio({ obligatorio: true })
  @ApiProperty({
    example: 'Pedro',
    description: 'First name of user',
    maxLength: 50,
  })
  @IsNotEmpty()
  @NombrePersona()
  readonly name!: string;

  @TextoNegocio({ obligatorio: true })
  @ApiProperty({
    example: 'Rubio',
    description: 'Last name of user',
    maxLength: 50,
  })
  @IsNotEmpty()
  @NombrePersona()
  readonly lastname!: string;

  @Telefono({ obligatorio: true })
  @ApiProperty({
    example: '+525512345678',
    description:
      'Teléfono en formato internacional (E.164): "+" y de 10 a 15 dígitos, sin espacios',
  })
  @TelefonoValido()
  readonly phone!: string;

  @Correo({ obligatorio: true })
  @ApiProperty({
    example: 'ejemplo@email.com',
    description: 'Email of user',
    maxLength: 100,
  })
  @CorreoValido()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({
    description:
      'Contraseña de 8 a 64 caracteres con al menos una minúscula, una mayúscula, un número y un símbolo',
    example: 'Pass#2026x',
    minLength: 8,
    maxLength: 64,
  })
  @ContrasenaNueva()
  @IsNotEmpty()
  readonly password!: string;

  @ApiProperty({
    description: 'Repeat same value as in password field',
    example: 'Pass#2026x',
  })
  @Match('password')
  @IsNotEmpty()
  @MaxLength(LIMITES.contrasena)
  readonly passwordConfirm!: string;
}
