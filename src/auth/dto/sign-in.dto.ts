import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  MaxLength,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Correo } from '../../common/normalizacion/normalizar';

export class SignInDto {
  // email
  @Correo({ obligatorio: true })
  @ApiProperty({
    description: 'email user',
    example: 'latest@email.com',
  })
  @IsEmail()
  @MaxLength(255)
  @IsNotEmpty()
  readonly email!: string;

  // password
  @ApiProperty({
    description: 'password user',
    example: 'Pass#2026',
  })
  @MinLength(8)
  @IsNotEmpty()
  readonly password!: string;
}
