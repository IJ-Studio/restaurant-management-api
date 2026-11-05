import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

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
  readonly name!: string;

  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Pérez' })
  @IsNotEmpty()
  readonly lastname!: string;

  @Telefono({ obligatorio: true })
  @ApiProperty({ example: '+34612345678' })
  @IsNotEmpty()
  readonly phone!: string;

  @Correo({ obligatorio: true })
  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({ example: 'Pass#2026' })
  @MinLength(8)
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
  readonly verified?: boolean;
}
