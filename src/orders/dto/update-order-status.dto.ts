import { IsIn } from 'class-validator';

/** Estados a los que el personal puede mover un pedido desde la app (cocina y piso). */
export const ESTATUS_OPERATIVOS = [
  'en_preparacion',
  'lista',
  'entregada',
] as const;
export type EstatusOperativo = (typeof ESTATUS_OPERATIVOS)[number];

/** Body de `PATCH /pedidos/:id/estatus`. */
export class UpdateOrderStatusDto {
  @IsIn(ESTATUS_OPERATIVOS, {
    message: `estatus debe ser uno de: ${ESTATUS_OPERATIVOS.join(', ')}`,
  })
  readonly estatus!: EstatusOperativo;
}
