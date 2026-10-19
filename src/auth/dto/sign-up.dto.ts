import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
  IsString,
} from 'class-validator';

import { Match } from '../../common/decorators/match.decorator';

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
  @ApiProperty({
    example: 'Pedro',
    description: 'First name of user',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly name!: string;

  @ApiProperty({
    example: 'Rubio',
    description: 'Last name of user',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly lastname!: string;

  @ApiProperty({
    example: '+525512345678',
    description:
      'Teléfono en formato internacional (E.164): "+" y de 10 a 15 dígitos, sin espacios',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, {
    message:
      'phone must be in international format: "+" followed by 10 to 15 digits',
  })
  readonly phone!: string;

  @ApiProperty({
    example: 'ejemplo@email.com',
    description: 'Email of user',
    maxLength: 100,
  })
  @IsEmail()
  @MaxLength(100)
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({
    description:
      'Contraseña de 8 a 64 caracteres con al menos una minúscula, una mayúscula, un número y un símbolo',
    example: 'Pass#2026x',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @MinLength(8, { message: 'password too short' })
  // Tope de 64: permite frases largas y queda lejos de los 72 bytes que bcrypt procesa.
  @MaxLength(64, { message: 'password too long' })
  @Matches(/[a-z]/, { message: 'password too weak: needs a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password too weak: needs an uppercase letter' })
  @Matches(/\d/, { message: 'password too weak: needs a number' })
  // Cualquier carácter que no sea letra, número ni espacio (el web acepta ! @ # $ % & , . -).
  @Matches(/[^A-Za-z0-9\s]/, { message: 'password too weak: needs a symbol' })
  @IsNotEmpty()
  readonly password!: string;

  @ApiProperty({
    description: 'Repeat same value as in password field',
    example: 'Pass#2026x',
  })
  @Match('password')
  @IsNotEmpty()
  readonly passwordConfirm!: string;
}
