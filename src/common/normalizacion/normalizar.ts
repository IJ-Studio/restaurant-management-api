import { Transform } from 'class-transformer';

// Controles C0/C1 (salvo salto de línea y tabulador), marcas de dirección y caracteres de ancho cero.
const INVALIDOS = new RegExp(
  // eslint-disable-next-line no-control-regex -- quitar los controles es justo el objetivo
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'g',
);

/**
 * Limpia un texto de entrada: quita caracteres inválidos, recorta y junta espacios repetidos
 * (conserva los saltos de línea). Vacío → null. Lo que no es texto pasa tal cual.
 */
export function limpiarTexto(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const limpio = valor
    .normalize('NFC')
    .replace(INVALIDOS, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
  return limpio === '' ? null : limpio;
}

/** Textos de negocio (nombres, direcciones, conceptos): limpios y en MAYÚSCULAS. */
export function textoNegocio(valor: unknown): unknown {
  const limpio = limpiarTexto(valor);
  return typeof limpio === 'string'
    ? limpio.toLocaleUpperCase('es-MX')
    : limpio;
}

/** Correos: limpios y en minúsculas. */
export function correo(valor: unknown): unknown {
  const limpio = limpiarTexto(valor);
  return typeof limpio === 'string' ? limpio.toLowerCase() : limpio;
}

/**
 * Decoradores para los DTO. Se aplican al convertir el cuerpo en el DTO (pipe global
 * `NormalizarPipe` y los pipes de validación), antes de validar. Con `obligatorio`, un vacío se
 * queda como `''` para que la validación lo rechace y no llegue un NULL a una columna NOT NULL.
 * Nunca se usan en contraseñas, hashes, tokens, URL, identificadores, enums, JSON técnico ni
 * valores cifrados: esos campos llegan como los manda el cliente.
 */
interface Opciones {
  obligatorio?: boolean;
}
const decorador =
  (fn: (v: unknown) => unknown) =>
  ({ obligatorio = false }: Opciones = {}) =>
    Transform(({ value }) => {
      const r = fn(value);
      return r === null && obligatorio && typeof value === 'string' ? '' : r;
    });
export const Texto = decorador(limpiarTexto);
export const TextoNegocio = decorador(textoNegocio);
export const Correo = decorador(correo);
