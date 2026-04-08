import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan' })
  @IsNotEmpty()
  readonly name!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsNotEmpty()
  readonly lastname!: string;

  @ApiProperty({ example: '+34612345678' })
  @IsNotEmpty()
  readonly phone!: string;

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
  @IsNumber()
  @Min(2) // No permitir crear admins
  @Max(5) // Roles válidos: 2-5
  readonly roleId?: number;

  @ApiProperty({ example: false })
  @IsOptional()
  readonly verified?: boolean;
}
