import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
  IsString,
  IsPhoneNumber,
  IsBoolean,
  IsOptional,
  IsNumber,
} from 'class-validator';

import { Match } from '../../common/decorators/match.decorator';

export class SignUpDto {
  @ApiProperty({
    example: 'Pedro',
    description: 'First name of user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({
    example: 'Rubio',
    description: 'Last name of user',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly lastname!: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of user',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  readonly phone!: string;

  @ApiProperty({
    example: 'ejemplo@email.com',
    description: 'Email of user',
  })
  @IsEmail()
  @MaxLength(255)
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({
    description: 'Password of user',
    example: 'Pass#123',
  })
  @MinLength(8, {
    message: 'password too short',
  })
  @MaxLength(20, {
    message: 'password too long',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'password too weak',
  })
  @IsNotEmpty()
  readonly password!: string;

  @ApiProperty({
    description: 'Repeat same value as in password field',
    example: 'Pass#123',
  })
  @Match('password')
  @IsNotEmpty()
  readonly passwordConfirm!: string;

  @ApiProperty({
    example: false,
    description: 'Whether user email is verified',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly verified?: boolean = false;

  @ApiProperty({
    example: 0,
    description: 'Number of login attempts',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  readonly loginAttempts?: number = 0;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'only user admins can assign new rol operative users',
  })
  @IsOptional()
  @IsNumber()
  readonly roleId?: number;
}
