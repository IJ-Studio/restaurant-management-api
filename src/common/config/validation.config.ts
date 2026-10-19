import { ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';

/**
 * Validación estricta de entrada: rechaza (400) cualquier campo que no esté declarado con
 * decoradores de class-validator en el DTO, además de aplicar las reglas de cada decorador.
 *
 * OJO: con `whitelist` un DTO sin decoradores perdería todos sus campos, así que este pipe
 * se aplica por parámetro (hoy: solo el body de `POST /auth/sign-in`) y no de forma global.
 *
 * `POST /auth/sign-up` queda fuera a propósito: su DTO nunca se había validado y el registro
 * del web (restaurant-management-web) manda contraseñas sin tope de longitud (el DTO exige
 * máx. 20) y teléfonos de 10 a 15 dígitos que `@IsPhoneNumber()` puede rechazar. Activarlo ahí
 * exige alinear primero el formulario del web.
 */
export const STRICT_VALIDATION_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
};

export const createStrictValidationPipe = (): ValidationPipe =>
  new ValidationPipe(STRICT_VALIDATION_OPTIONS);
