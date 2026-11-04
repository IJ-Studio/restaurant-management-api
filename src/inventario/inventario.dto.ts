import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  Correo,
  Telefono,
  Texto,
  TextoNegocio,
} from '../common/normalizacion/normalizar';

const noNulo = (_: object, v: unknown) => v !== null && v !== undefined;

/**
 * Producto del inventario (mismas claves que usa la web). Todo opcional en el DTO: en el alta, el
 * servicio exige nombre y categoría (una subclase heredaría el `@IsOptional` y no los exigiría).
 */
export class ProductoDto {
  @TextoNegocio({ obligatorio: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  readonly name?: string;

  @Texto()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly sku?: string | null;

  @TextoNegocio({ obligatorio: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly category?: string;

  @Texto({ obligatorio: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  readonly stock?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  readonly minStock?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  readonly maxStock?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly costPerUnit?: number;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  readonly supplier?: string | null;

  @IsOptional()
  @IsBoolean()
  readonly active?: boolean;
}

export class AjusteExistenciasDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  readonly stock!: number;
}

/** Proveedor (mismas claves que usa la web). */
export class ProveedorDto {
  @TextoNegocio({ obligatorio: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  readonly name?: string;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  readonly contact?: string | null;

  @Correo()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  readonly email?: string | null;

  @Telefono()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly phone?: string | null;

  @Texto()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly website?: string | null;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly address?: string | null;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  readonly category?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  readonly products?: string[];

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  readonly paymentTerms?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly deliveryDays?: number;

  @IsOptional()
  @IsBoolean()
  readonly active?: boolean;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly notes?: string | null;
}

export class ArticuloOrdenDto {
  @TextoNegocio({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  readonly productName!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  readonly quantity!: number;

  @Texto({ obligatorio: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly unit!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly unitCost!: number;
}

// Los mismos que usa la pantalla de proveedores de la web.
export const ESTADOS_ORDEN = [
  'borrador',
  'enviada',
  'confirmada',
  'en_camino',
  'recibida',
  'cancelada',
] as const;

/** Orden de compra. El total lo calcula el API con los artículos. */
export class OrdenCompraDto {
  @IsOptional()
  @ValidateIf(noNulo)
  @IsInt()
  @Min(1)
  readonly supplierId?: number | null;

  @IsOptional()
  @IsIn(ESTADOS_ORDEN)
  readonly status?: (typeof ESTADOS_ORDEN)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ArticuloOrdenDto)
  readonly items?: ArticuloOrdenDto[];

  @Texto()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  readonly expectedAt?: string | null;

  @TextoNegocio()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly notes?: string | null;
}
