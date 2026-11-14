import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/** Tope duro de la página de usuarios. */
export const USERS_MAX_LIMIT = 100;
/** Página por defecto cuando el cliente no manda `limit`. */
export const USERS_DEFAULT_LIMIT = 50;

/**
 * Paginación por cursor de `GET /users`: `cursor` es el último `id` de la página anterior.
 * La respuesta sigue siendo un arreglo y el siguiente cursor va en `X-Next-Cursor`.
 * `incluirInactivos=true` añade a quienes se dio de baja, para poder reactivarlos.
 */
export class GetUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USERS_MAX_LIMIT)
  readonly limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly cursor?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly incluirInactivos?: boolean;
}
