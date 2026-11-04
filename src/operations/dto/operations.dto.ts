import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Tipos de incidencia que cocina (o el piso) reporta desde la app. */
export const TIPOS_INCIDENCIA = [
  'retraso',
  'falta_insumo',
  'equipo',
  'devolucion',
  'otro',
] as const;
export type TipoIncidencia = (typeof TIPOS_INCIDENCIA)[number];

/** Body de `POST /cocina/incidencias`. */
export class CreateIncidentDto {
  @IsIn(TIPOS_INCIDENCIA)
  readonly tipo!: TipoIncidencia;

  /** Pedido afectado (opcional: "se acabó el gas" no es de un pedido). */
  @IsOptional()
  @IsUUID()
  readonly ordenId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly mensaje?: string;

  /** Solo en retrasos: cuántos minutos más se estima. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  readonly minutos?: number;
}

export const MOTIVOS_MERMA = [
  'caducado',
  'danado',
  'derrame',
  'preparacion',
  'devolucion',
  'otro',
] as const;

/** Body de `POST /inventario/mermas`. */
export class CreateWasteDto {
  /** Producto del inventario; si se manda, se descuenta del stock. */
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly productId?: number;

  /** Nombre libre cuando no está en el inventario. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  readonly productName?: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100000)
  readonly quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly unit?: string;

  @IsIn(MOTIVOS_MERMA)
  readonly reason!: (typeof MOTIVOS_MERMA)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  readonly justification!: string;
}

/** Body de `POST /caja/abrir`. */
export class OpenCashDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  readonly fondoInicial!: number;
}

/** Body de `POST /caja/cerrar`. */
export class CloseCashDto {
  /** Efectivo que se contó en la caja al cerrar. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  readonly efectivoContado!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly notas?: string;
}
