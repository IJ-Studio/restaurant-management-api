import {
  ArrayMaxSize,
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

// Cantidad por platillo: el tope de /reglas (pedidos.cantidadMaxPorPlatillo) también se revisa en el servicio.
const CANTIDAD = { message: 'La cantidad debe ser un entero de 1 a 99.' };
const PLATILLO = { message: 'El platillo no es válido.' };

class OrderItemDto {
  @IsInt(PLATILLO)
  @IsNotEmpty()
  @Min(1, PLATILLO)
  platilloId: number;

  @IsInt(CANTIDAD)
  @IsNotEmpty()
  @Min(1, CANTIDAD)
  @Max(99, CANTIDAD)
  cantidad: number;

  /** Indicación para cocina sobre este platillo ("sin cebolla"). */
  @TextoNegocio()
  @IsString()
  @IsOptional()
  @MaxLength(200)
  notas?: string;
}

export class CreateOrderMesaDto {
  /**
   * Compatibilidad con la app móvil 1.0.0 (versionCode 9), que todavía lo envía. Se acepta y se
   * ignora: el pedido siempre se asigna al usuario del token (DT-04).
   */
  @IsInt()
  @IsOptional()
  usuarioId?: number;

  @IsInt(PLATILLO)
  @IsOptional()
  @Min(1, PLATILLO)
  platilloId?: number;

  @IsInt(CANTIDAD)
  @IsOptional()
  @Min(1, CANTIDAD)
  @Max(99, CANTIDAD)
  cantidad?: number;

  @Texto()
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'La mesa no es válida.' })
  mesa?: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100, {
    message: 'Un pedido admite como máximo 100 platillos distintos.',
  })
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
