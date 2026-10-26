import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Campos editables de un perfil con `PATCH /users/:id`.
 * Rol, contraseña y estado se cambian en endpoints aparte: aquí no se aceptan.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ana', maxLength: 50 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly name?: string;

  @ApiPropertyOptional({ example: 'López', maxLength: 50 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly lastname?: string;

  @ApiPropertyOptional({
    example: '+525512345678',
    description:
      'Teléfono en formato internacional (E.164): "+" y de 10 a 15 dígitos, sin espacios',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{9,14}$/, {
    message:
      'phone must be in international format: "+" followed by 10 to 15 digits',
  })
  readonly phone?: string;
}
