import { applyDecorators } from '@nestjs/common';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

/**
 * Reglas de campo comunes (docs/validaciones-publicas.md §2, DV-03 a DV-05 y DV-11). Se aplican
 * después de normalizar (`TextoNegocio`, `Correo`, `Telefono`), así que validan el valor que se guarda.
 * Los mismos límites y textos se publican en `GET /reglas` (`campos`) para la web y la móvil.
 */
export const LIMITES = {
  nombrePersona: 60,
  nombreCompleto: 120,
  correo: 254,
  lineaCorta: 150,
  lineaMedia: 100,
  alias: 40,
  notas: 500,
  referencias: 300,
  ocasion: 60,
  razonSocial: 300,
  contrasena: 64,
} as const;

/** Letras de cualquier alfabeto; espacio, guion o apóstrofo solo entre letras (DV-03). */
export const NOMBRE_PERSONA = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

/** E.164 ya normalizado: México con 10 dígitos, otras ladas con 6 a 12 dígitos nacionales (DV-05). */
export const TELEFONO_E164 = /^(?:\+52\d{10}|\+(?!52)[1-9]\d{7,14})$/;

export const MENSAJES_CAMPOS = {
  nombre: (min: number, max: number) =>
    `Escribe el nombre: solo letras, espacios, guion o apóstrofo (${min} a ${max}).`,
  correo: 'Escribe un correo válido, como nombre@dominio.com.',
  telefono:
    'Escribe un teléfono válido: 10 dígitos en México o de 6 a 12 con otra lada.',
  maximo: (max: number) => `Máximo ${max} caracteres.`,
  texto: 'Debe ser texto.',
} as const;

export const NombrePersona = (
  min = 2,
  max: number = LIMITES.nombrePersona,
  message = MENSAJES_CAMPOS.nombre(min, max),
) =>
  applyDecorators(
    IsString({ message }),
    Length(min, max, { message }),
    Matches(NOMBRE_PERSONA, { message }),
  );

export const CorreoValido = () =>
  applyDecorators(
    IsString({ message: MENSAJES_CAMPOS.correo }),
    MaxLength(LIMITES.correo, { message: MENSAJES_CAMPOS.correo }),
    IsEmail({}, { message: MENSAJES_CAMPOS.correo }),
  );

export const TelefonoValido = () =>
  applyDecorators(
    IsString({ message: MENSAJES_CAMPOS.telefono }),
    Matches(TELEFONO_E164, { message: MENSAJES_CAMPOS.telefono }),
  );

/** Texto con máximo; `each` para listas de textos. */
export const TextoMax = (max: number, each = false) =>
  applyDecorators(
    IsString({ message: MENSAJES_CAMPOS.texto, each }),
    MaxLength(max, { message: MENSAJES_CAMPOS.maximo(max), each }),
  );

/** Contraseña nueva: 8 a 64 (bcrypt procesa 72 bytes) con minúscula, mayúscula, número y símbolo. */
export const ContrasenaNueva = () =>
  applyDecorators(
    IsString({ message: 'Escribe una contraseña.' }),
    Length(8, LIMITES.contrasena, {
      message: 'La contraseña debe tener de 8 a 64 caracteres.',
    }),
    Matches(/[a-z]/, { message: 'La contraseña necesita una minúscula.' }),
    Matches(/[A-Z]/, { message: 'La contraseña necesita una mayúscula.' }),
    Matches(/\d/, { message: 'La contraseña necesita un número.' }),
    Matches(/[^A-Za-z0-9\s]/, {
      message: 'La contraseña necesita un símbolo.',
    }),
  );

/** Lo que `GET /reglas` publica de los campos: límites, patrones y textos (fuente única, §7 del plan). */
export const CAMPOS_PUBLICOS = {
  limites: LIMITES,
  patrones: {
    nombrePersona: NOMBRE_PERSONA.source,
    telefonoE164: TELEFONO_E164.source,
  },
  mensajes: {
    nombre: MENSAJES_CAMPOS.nombre(2, LIMITES.nombrePersona),
    nombreReserva:
      'Escribe el nombre de quien reserva: solo letras, espacios, guion o apóstrofo (2 a 120).',
    correo: MENSAJES_CAMPOS.correo,
    telefono: MENSAJES_CAMPOS.telefono,
  },
};
