import { IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPlatillosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoriaId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  disponible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
