import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ContrasenaNueva } from '../../common/validacion/campos';

/** Contrato de `PATCH /users/:id/password`: exige la contraseña actual. */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña que el usuario tiene hoy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  readonly currentPassword!: string;

  @ApiProperty({
    description:
      'Contraseña de 8 a 64 caracteres con al menos una minúscula, una mayúscula, un número y un símbolo',
    example: 'Nueva#2026x',
  })
  @ContrasenaNueva()
  @IsNotEmpty()
  readonly newPassword!: string;
}
