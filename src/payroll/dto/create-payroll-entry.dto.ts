import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { LIMITES, TextoMax } from '../../common/validacion/campos';
import { TextoNegocio } from '../../common/normalizacion/normalizar';

export class CreatePayrollEntryDto {
  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Mesero 4' })
  @IsString()
  @IsNotEmpty()
  @TextoMax(LIMITES.lineaMedia)
  readonly role!: string;

  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  @TextoMax(LIMITES.lineaMedia)
  readonly name!: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  readonly weeklyPay!: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  readonly active?: boolean;

  @TextoNegocio()
  @ApiProperty({ example: 'Servicio', required: false })
  @IsOptional()
  @IsString()
  @TextoMax(60)
  readonly department?: string;
}
