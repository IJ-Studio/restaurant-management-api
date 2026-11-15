/**
 * Traduce los mensajes por defecto de class-validator (en inglés) que salen cuando un decorador no
 * trae `message`. Los mensajes propios ya están en español y pasan tal cual.
 */
const TRADUCCIONES: [RegExp, string][] = [
  [/^property (\S+) should not exist$/, 'El campo «$1» no está permitido.'],
  [/^(\S+) should not be empty$/, '«$1» es obligatorio.'],
  [/^(\S+) should not be null or undefined$/, '«$1» es obligatorio.'],
  [/^(\S+) must be a string$/, '«$1» debe ser texto.'],
  [/^(\S+) must be an integer number$/, '«$1» debe ser un número entero.'],
  [
    /^(\S+) must be a number conforming to the specified constraints$/,
    '«$1» debe ser un número.',
  ],
  [/^(\S+) must be a positive number$/, '«$1» debe ser mayor que 0.'],
  [/^(\S+) must be a boolean value$/, '«$1» debe ser sí o no.'],
  [/^(\S+) must be an array$/, '«$1» debe ser una lista.'],
  [/^(\S+) must be an email$/, '«$1» debe ser un correo válido.'],
  [/^(\S+) must be a UUID$/, '«$1» no es un identificador válido.'],
  [
    /^(\S+) must be a valid ISO 8601 date string$/,
    '«$1» debe ser una fecha válida.',
  ],
  [
    /^(\S+) must be one of the following values: (.+)$/,
    '«$1» debe ser uno de: $2.',
  ],
  [/^(\S+) must not be less than (\S+)$/, '«$1» no puede ser menor que $2.'],
  [/^(\S+) must not be greater than (\S+)$/, '«$1» no puede ser mayor que $2.'],
  [
    /^(\S+) must be longer than or equal to (\d+) characters$/,
    '«$1» debe tener al menos $2 caracteres.',
  ],
  [
    /^(\S+) must be shorter than or equal to (\d+) characters$/,
    '«$1» debe tener como máximo $2 caracteres.',
  ],
  [
    /^nested property (\S+) must be either object or array$/,
    '«$1» tiene un formato no válido.',
  ],
  [/^(\S+) must be an object$/, '«$1» tiene un formato no válido.'],
];

export function traducirDetalle(texto: string): string {
  for (const [patron, reemplazo] of TRADUCCIONES)
    if (patron.test(texto)) return texto.replace(patron, reemplazo);
  return texto;
}
