import { IsString, MaxLength, MinLength } from 'class-validator';

import { TextoNegocio } from '../../common/normalizacion/normalizar';

/** Cuerpo de `PATCH /pedidos/cancelar/:id`: el motivo es obligatorio (Prioridad 3.3). */
export class CancelOrderDto {
  @TextoNegocio({ obligatorio: true })
  @IsString({ message: 'Escribe el motivo de la cancelación.' })
  @MinLength(3, { message: 'Escribe el motivo de la cancelación.' })
  @MaxLength(300)
  readonly motivo!: string;
}
