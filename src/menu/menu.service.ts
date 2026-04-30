import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatillosRepository } from './repositories/platillos.repository';
// import { CreatePlatilloDto } from './dto/create-platillo.dto';
// import { UpdatePlatilloDto } from './dto/update-platillo.dto';
import { QueryPlatillosDto } from './dto/query-platillos.dto';
// import { PlatilloResponseDto } from './dto/platillo-response.dto';
// import { platilloToResponseDto } from './utils/platillo-mapper';

@Injectable()
export class MenuService {
  constructor(private readonly platillosRepo: PlatillosRepository) {}

  // async findAll(query: QueryPlatillosDto): Promise<PlatilloResponseDto[]> {
  //   const platillos = await this.platillosRepo.findAll({
  //     categoriaId: query.categoriaId,
  //     disponible: query.disponible,
  //     limit: query.limit,
  //     offset: query.offset,
  //   });
  //   return platillos.map(platilloToResponseDto);
  // }

  // async findOne(id: number): Promise<PlatilloResponseDto> {
  //   const platillo = await this.platillosRepo.findById(id);
  //   if (!platillo)
  //     throw new NotFoundException(`Platillo con id ${id} no encontrado`);
  //   return platilloToResponseDto(platillo);
  // }

  // async create(dto: CreatePlatilloDto): Promise<PlatilloResponseDto> {
  //   const newPlatillo = await this.platillosRepo.create(dto);
  //   return platilloToResponseDto(newPlatillo);
  // }

  // async update(
  //   id: number,
  //   dto: UpdatePlatilloDto,
  // ): Promise<PlatilloResponseDto> {
  //   const updated = await this.platillosRepo.update(id, dto);
  //   if (!updated)
  //     throw new NotFoundException(`Platillo con id ${id} no encontrado`);
  //   return platilloToResponseDto(updated);
  // }

  // async delete(id: number): Promise<void> {
  //   const deleted = await this.platillosRepo.delete(id);
  //   if (!deleted)
  //     throw new NotFoundException(`Platillo con id ${id} no encontrado`);
  // }

  // Endpoint público para landing
  async getPublicPlatillos(categoriaId?: number) {
    const platillos = await this.platillosRepo.findPublicPlatillos(categoriaId);
    // Aquí puedes mapear a un DTO específico para landing (sin campos internos)
    return platillos.map((p) => ({
      id: p.id.toString(), // ← convertir a string para coincidir con interfaz del front
      name: p.nombre,
      description: p.descripcionCorta ?? '',
      price: Number(p.precio),
      image: p.imagenUrl ?? '/images/default-dish.jpg',
      category: p.categoria?.nombre ?? 'Sin categoría',
      tag: p.esPopular
        ? 'Popular'
        : p.esNuevo
          ? 'Nuevo'
          : p.esDelChef
            ? "Chef's Pick"
            : undefined,
      rating: 4.5,
      prepTime: p.tiempoPreparacion ? `${p.tiempoPreparacion} min` : '15 min',
    }));
  }

  // async getPublicCategorias() {
  //   return await this.platillosRepo.findPublicCategorias();
  // }
}
