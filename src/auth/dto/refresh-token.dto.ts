import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Contrato de `POST /auth/refresh`. */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Token de refresco entregado por el login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly refreshToken!: string;
}
