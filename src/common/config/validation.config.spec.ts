import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { AuthController } from '../../auth/auth.controller';
import { SignInDto } from '../../auth/dto/sign-in.dto';
import { createStrictValidationPipe } from './validation.config';

const validate = (value: unknown, metatype: new () => object) =>
  createStrictValidationPipe().transform(value, { type: 'body', metatype });

/** Pipes que Nest aplica a los parámetros de un método del controlador. */
const paramPipes = (method: keyof AuthController): unknown[] => {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    AuthController,
    method,
  ) as Record<string, { pipes: unknown[] }>;
  return Object.values(args).flatMap((arg) => arg.pipes);
};

describe('Validación estricta de entrada (sign-in)', () => {
  it('el body de POST /auth/sign-in usa el ValidationPipe estricto', () => {
    const pipes = paramPipes('signIn');
    expect(pipes).toHaveLength(1);
    expect(pipes[0]).toBeInstanceOf(ValidationPipe);
  });

  it('acepta exactamente el body que mandan el web y la app móvil', async () => {
    // restaurant-management-web: app/(auth)/login/page.tsx → { email, password }
    const body = { email: 'mesero@elquijote.mx', password: 'Pass#2026' };
    await expect(validate(body, SignInDto)).resolves.toEqual(body);
  });

  it.each([
    ['sin email', { password: 'Pass#2026' }],
    ['sin password', { email: 'mesero@elquijote.mx' }],
    [
      'email con formato inválido',
      { email: 'no-es-correo', password: 'Pass#2026' },
    ],
    [
      'password menor a 8 caracteres',
      { email: 'mesero@elquijote.mx', password: 'corta' },
    ],
    ['email que no es string', { email: { $ne: null }, password: 'Pass#2026' }],
    [
      'password que no es string',
      { email: 'mesero@elquijote.mx', password: 12345678 },
    ],
    ['body vacío', {}],
  ])('rechaza con 400: %s', async (_caso, body) => {
    await expect(validate(body, SignInDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza campos que no están en el DTO (p. ej. roleId)', async () => {
    const body = {
      email: 'mesero@elquijote.mx',
      password: 'Pass#2026',
      roleId: 1,
    };
    await expect(validate(body, SignInDto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
