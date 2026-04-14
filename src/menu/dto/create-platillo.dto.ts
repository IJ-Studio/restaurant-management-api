// import {
//   IsString,
//   IsInt,
//   IsOptional,
//   IsBoolean,
//   IsNumber,
//   Min,
//   Max,
//   IsDateString,
//   IsPositive,
// } from 'class-validator';
// import { Type } from 'class-transformer';

// export class CreatePlatilloDto {
//   @IsInt()
//   @IsPositive()
//   categoriaId: number;

//   @IsOptional()
//   @IsInt()
//   @IsPositive()
//   subcategoriaId?: number;

//   @IsOptional()
//   @IsString()
//   codigo?: string;

//   @IsString()
//   nombre: string;

//   @IsOptional()
//   @IsString()
//   descripcion?: string;

//   @IsOptional()
//   @IsString()
//   descripcionCorta?: string;

//   @IsOptional()
//   @IsString()
//   imagenUrl?: string;

//   @IsNumber()
//   @Type(() => Number)
//   precio: number;

//   @IsOptional()
//   @IsNumber()
//   @Type(() => Number)
//   precioCosto?: number;

//   @IsOptional()
//   @IsInt()
//   @Type(() => Number)
//   tiempoPreparacion?: number;

//   @IsOptional()
//   @IsBoolean()
//   esVegetariano?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   esVegano?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   esSinGluten?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   esPicante?: boolean;

//   @IsOptional()
//   @IsInt()
//   @Min(0)
//   @Max(5)
//   nivelPicante?: number;

//   @IsOptional()
//   @IsBoolean()
//   esPopular?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   esNuevo?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   esDelChef?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   disponible?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   disponibleTakeout?: boolean;

//   @IsOptional()
//   @IsInt()
//   orden?: number;

//   @IsOptional()
//   @IsString()
//   notasCocina?: string;

//   @IsOptional()
//   @IsDateString()
//   fechaAlta?: string;
// }
