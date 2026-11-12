import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Texto, TextoNegocio } from '../../common/normalizacion/normalizar';

class OrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  platilloId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  cantidad: number;

  /** Indicación para cocina sobre este platillo ("sin cebolla"). */
  @TextoNegocio()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  notas?: string;
}

export class CreateOrderMesaDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  platilloId?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  cantidad?: number;

  @Texto()
  @IsString()
  @IsOptional()
  mesa?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  /** Personas en la mesa (app móvil del mesero). */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  numComensales?: number;

  /** Nota general para cocina ("alergia a la nuez", "llevar todo junto"). */
  @TextoNegocio()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notasCocina?: string;
}
