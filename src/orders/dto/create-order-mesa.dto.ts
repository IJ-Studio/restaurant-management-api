import { IsNumber, IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  platilloId: number;

  @IsNumber()
  @IsNotEmpty()
  cantidad: number;
}

export class CreateOrderMesaDto {
  @IsNumber()
  @IsOptional()
  platilloId?: number;

  @IsNumber()
  @IsOptional()
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
