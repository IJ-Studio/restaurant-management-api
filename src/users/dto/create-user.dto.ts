import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import {
  ContrasenaNueva,
  CorreoValido,
  NombrePersona,
  TelefonoValido,
} from '../../common/validacion/campos';

import { CREATABLE_ROLES } from '../../common/constants/roles';
import {
  Correo,
  Telefono,
  TextoNegocio,
} from '../../common/normalizacion/normalizar';

export class CreateUserDto {
  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Juan' })
  @IsNotEmpty()
  @NombrePersona()
  readonly name!: string;

  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Pérez' })
  @IsNotEmpty()
  @NombrePersona()
  readonly lastname!: string;

  @Telefono({ obligatorio: true })
  @ApiProperty({ example: '+34612345678' })
  @IsNotEmpty()
  @TelefonoValido()
  readonly phone!: string;

  @Correo({ obligatorio: true })
  @ApiProperty({ example: 'juan@example.com' })
  @CorreoValido()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({ example: 'Pass#2026' })
  @ContrasenaNueva()
  @IsNotEmpty()
  readonly password!: string;

  @ApiProperty({
    example: 2,
    description: '2=Cajero, 3=Mesero, 4=Cocina, 5=Cliente',
  })
  @IsOptional()
  @IsInt()
  @IsIn(CREATABLE_ROLES)
  readonly roleId?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  readonly verified?: boolean;
}
