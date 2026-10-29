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

  /** Folio o autorización de la terminal. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly referencia?: string;
}
