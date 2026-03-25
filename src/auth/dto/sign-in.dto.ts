import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  MaxLength,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class SignInDto {
  // email
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
