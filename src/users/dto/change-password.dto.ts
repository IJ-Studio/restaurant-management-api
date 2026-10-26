import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Contrato de `PATCH /users/:id/password`: exige la contraseña actual. */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña que el usuario tiene hoy' })
  @IsString()
  @IsNotEmpty()
  readonly currentPassword!: string;

  @ApiProperty({
    description:
      'Contraseña de 8 a 64 caracteres con al menos una minúscula, una mayúscula, un número y un símbolo',
    example: 'Nueva#2026x',
  })
  @IsString()
  @MinLength(8, { message: 'password too short' })
  @MaxLength(64, { message: 'password too long' })
  @Matches(/[a-z]/, { message: 'password too weak: needs a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password too weak: needs an uppercase letter' })
  @Matches(/\d/, { message: 'password too weak: needs a number' })
  @Matches(/[^A-Za-z0-9\s]/, { message: 'password too weak: needs a symbol' })
  @IsNotEmpty()
  readonly newPassword!: string;
}
