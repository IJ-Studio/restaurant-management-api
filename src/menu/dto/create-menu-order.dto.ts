import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuOrderItemDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  readonly platilloId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  readonly cantidad!: number;

  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(0)
  readonly precioUnitario!: number;
}

/** Contrato de `POST /menu/orders` (carrito del menú público). */
export class CreateMenuOrderDto {
  @ApiProperty({ type: [MenuOrderItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MenuOrderItemDto)
  readonly productos!: MenuOrderItemDto[];

  @ApiPropertyOptional({ example: 'mesa' })
  @IsOptional()
  @IsString()
  readonly tipoPedido?: string;
}
