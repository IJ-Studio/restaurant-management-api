import { PlatilloResponseDto } from '../dto/platillo-response.dto';

export class PlatilloMapper {
  static toResponse(row: { platillo: any; categoria: any }): PlatilloResponseDto {
    const { platillo, categoria } = row;

    return {
      id: platillo.id,
      nombre: platillo.nombre,
      descripcion: platillo.descripcion || '',
      descripcionCorta: platillo.descripcionCorta || undefined,
      imagenUrl: platillo.imagenUrl || undefined,
      // Convertimos el string numérico de Postgres a number para JavaScript/TypeScript
      precio: typeof platillo.precio === 'string' ? parseFloat(platillo.precio) : platillo.precio,
      tiempoPreparacion: platillo.tiempoPreparacion || undefined,
      disponible: platillo.disponible ?? true,
      esVegetariano: platillo.esVegetariano ?? false,
      esVegano: platillo.esVegano ?? false,
      esSinGluten: platillo.esSinGluten ?? false,
      esPicante: platillo.esPicante ?? false,
      nivelPicante: platillo.nivelPicante || undefined,
      esPopular: platillo.esPopular ?? false,
      esNuevo: platillo.esNuevo ?? false,
      esDelChef: platillo.esDelChef ?? false,
      categoria: categoria?.id ? { id: categoria.id, nombre: categoria.nombre } : undefined,
    };
  }
}
