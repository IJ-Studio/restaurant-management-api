/** Orígenes permitidos si no se define CORS_ORIGINS (los de siempre). */
export const ORIGENES_POR_DEFECTO = [
  'https://el-quijote.vercel.app',
  'http://localhost:3000',
];

/**
 * Orígenes de CORS desde `CORS_ORIGINS` (separados por comas). Vacía o ausente → los de siempre.
 * Solo se aceptan orígenes http(s) completos; lo demás se descarta.
 */
export function origenesCors(valor = process.env.CORS_ORIGINS): string[] {
  const lista = (valor ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => /^https?:\/\/[^/\s]+$/.test(o));
  return lista.length ? lista : ORIGENES_POR_DEFECTO;
}
