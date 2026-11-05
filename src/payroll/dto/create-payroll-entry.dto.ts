import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TextoNegocio } from '../../common/normalizacion/normalizar';

export class CreatePayrollEntryDto {
  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Mesero 4' })
  @IsString()
  @IsNotEmpty()
  readonly role!: string;

  @TextoNegocio({ obligatorio: true })
  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
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
  readonly department?: string;
}
