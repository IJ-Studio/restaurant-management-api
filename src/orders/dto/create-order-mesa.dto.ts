import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  platilloId: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  cantidad: number;
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

  @IsNumber()
  @IsNotEmpty()
  usuarioId: number;

  @IsString()
  @IsOptional()
  mesa?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}
