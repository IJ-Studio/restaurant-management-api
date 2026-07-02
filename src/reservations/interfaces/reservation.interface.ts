export interface IReservation {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail: string;
  fechaHora: Date;
  numComensales: number;
  estatus: string;
  canal: string;
  mesaId?: number;
  peticionesEspeciales?: string;
  ocasion?: string;
  createdAt: Date;
  updatedAt: Date;
}
