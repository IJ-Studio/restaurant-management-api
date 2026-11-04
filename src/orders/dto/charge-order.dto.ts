import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

/** Body de `POST /pedidos/:id/cobrar`: cobro en caja (efectivo o terminal física). */
export class ChargeOrderDto {
  /** Fila de `metodos_pago` (ver `GET /pedidos/metodos-pago`). */
  @IsInt()
  @Min(1)
  readonly metodoPagoId!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  readonly propina?: number;

  /** Solo en efectivo: con cuánto pagó el cliente, para calcular el cambio. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  readonly montoRecibido?: number;

  /** Cuenta separada: cuánto del consumo se cobra en este pago. Sin él se cobra todo lo que falta. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  readonly monto?: number;

  /** Para quién es este pago en una cuenta separada ("Persona 2"). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  readonly etiqueta?: string;

  /** Folio o autorización de la terminal. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly referencia?: string;
}
