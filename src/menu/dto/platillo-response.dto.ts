import { IsNumber, IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

class CategoriaDto {
  @IsNumber()
  id: number;

  @IsString()
  nombre: string;
}

export class PlatilloResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  nombre: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsString()
  descripcionCorta?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsNumber()
  precio: number;

  @IsOptional()
  @IsNumber()
  tiempoPreparacion?: number;

  @IsBoolean()
  disponible: boolean;

  @IsBoolean()
  esVegetariano: boolean;

  @IsBoolean()
  esVegano: boolean;

  @IsBoolean()
  esSinGluten: boolean;

  @IsBoolean()
  esPicante: boolean;

  @IsOptional()
  @IsNumber()
  nivelPicante?: number;

  @IsBoolean()
  esPopular: boolean;

  @IsBoolean()
  esNuevo: boolean;

  @IsBoolean()
  esDelChef: boolean;

  @IsOptional()
  @IsObject()
  categoria?: CategoriaDto;
}
