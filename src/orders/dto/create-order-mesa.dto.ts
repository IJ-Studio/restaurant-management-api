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

class OrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  platilloId: number;

  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  /** Indicación para cocina sobre este platillo ("sin cebolla"). */
  @IsString()
  @IsOptional()
  @MaxLength(200)
  notas?: string;
}

export class CreateOrderMesaDto {
  @IsNumber()
  @IsOptional()
  platilloId?: number;

  @IsNumber()
  @IsOptional()
  cantidad?: number;

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
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notasCocina?: string;
}
