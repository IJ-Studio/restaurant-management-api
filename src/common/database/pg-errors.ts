/** Códigos de error de Postgres que el API traduce a respuestas HTTP. */
export type PgErrorCode = '23505' | '23503' | '23514';

/** Drizzle envuelve el error del driver: el código puede estar en `cause`. */
export function getPgErrorCode(error: unknown): string | undefined {
  const codeOf = (value: unknown): string | undefined => {
    if (typeof value !== 'object' || value === null || !('code' in value)) {
      return undefined;
    }

    const code = (value as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  };

  const cause =
    typeof error === 'object' && error !== null && 'cause' in error
      ? (error as { cause?: unknown }).cause
      : undefined;

  return codeOf(error) ?? codeOf(cause);
}

export const isUniqueViolation = (error: unknown): boolean =>
  getPgErrorCode(error) === '23505';
