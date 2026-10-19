import { ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';

/**
 * Validación estricta de entrada: rechaza (400) cualquier campo que no esté declarado con
 * decoradores de class-validator en el DTO, además de aplicar las reglas de cada decorador.
 *
 * OJO: con `whitelist` un DTO sin decoradores perdería todos sus campos, así que este pipe
 * se aplica por parámetro (hoy: el body de `POST /auth/sign-in` y `POST /auth/sign-up`) y no de
 * forma global. Para extenderlo a otro endpoint, primero hay que revisar que su DTO esté
 * decorado y que el cliente que lo llama (web y app móvil) no mande campos de más.
 *
 * Regla de alineación con el web: el formulario del cliente puede ser más estricto que el DTO
 * (mejor experiencia), pero nunca más permisivo; todo lo que el formulario acepta debe pasar
 * aquí.
 */
export const STRICT_VALIDATION_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

export const createStrictValidationPipe = (): ValidationPipe =>
  new ValidationPipe(STRICT_VALIDATION_OPTIONS);
