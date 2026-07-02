import { Expose, Transform } from 'class-transformer';

export class ReservationResponseDto {
  @Expose()
  id: string;

  @Expose()
  clienteNombre: string;

  @Expose()
  clienteTelefono: string;

  @Expose()
  clienteEmail: string;

  @Expose()
  fechaHora: Date;

  @Expose()
  numComensales: number;

  @Expose()
  estatus: string;

  @Expose()
  canal: string;

  @Expose()
  peticionesEspeciales?: string;

  @Expose()
  ocasion?: string;

  @Expose()
  @Transform(({ obj }) => obj.mesa?.numero ?? null)
  mesaNumero?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
