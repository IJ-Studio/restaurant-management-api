import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { createStrictValidationPipe } from '../../common/config/validation.config';
import { AuthService } from '../auth.service';
import { SignUpDto } from './sign-up.dto';

const validate = (value: unknown) =>
  createStrictValidationPipe().transform(value, {
    type: 'body',
    metatype: SignUpDto,
  });

/** Igual que `registerAction` en restaurant-management-web: app/(auth)/register/page.tsx. */
const webPayload = (over: Record<string, unknown> = {}) => ({
  name: 'Pedro',
  lastname: 'Rubio',
  email: 'pedro@elquijote.mx',
  phone: '+525512345678',
  password: 'Quijote#2026x',
  passwordConfirm: 'Quijote#2026x',
  ...over,
});

const withPassword = (password: string) =>
  webPayload({ password, passwordConfirm: password });

describe('SignUpDto con validación estricta', () => {
  describe('acepta lo que manda el formulario del web', () => {
    it('payload completo', async () => {
      await expect(validate(webPayload())).resolves.toMatchObject({
        email: 'pedro@elquijote.mx',
        phone: '+525512345678',
      });
    });

    it.each([
      ['contraseña de 8 caracteres', 'Aa1!aaaa'],
      ['contraseña de 64 caracteres', `Aa1!${'x'.repeat(60)}`],
      ['contraseña que empieza con punto', '.Quijote2026'],
      ['contraseña con - , . como símbolo', 'Quijote-2026'],
      ['contraseña con frase y espacios', 'Mi frase larga 2026!'],
    ])('%s', async (_caso, password) => {
      await expect(validate(withPassword(password))).resolves.toBeDefined();
    });

    it('nombre y apellido de 50 caracteres (límite de la columna)', async () => {
      const largo = 'a'.repeat(50);
      await expect(
        validate(webPayload({ name: largo, lastname: largo })),
      ).resolves.toBeDefined();
    });

    it('email de 100 caracteres (límite de la columna)', async () => {
      const email = `${'a'.repeat(60)}@${'b'.repeat(36)}.mx`;
      expect(email).toHaveLength(100);
      await expect(validate(webPayload({ email }))).resolves.toBeDefined();
    });
  });

  describe('rechaza con 400', () => {
    it.each([
      ['contraseña de 7 caracteres', withPassword('Aa1!aaa')],
      ['contraseña de 65 caracteres', withPassword(`Aa1!${'x'.repeat(61)}`)],
      ['contraseña sin mayúscula', withPassword('quijote#2026')],
      ['contraseña sin minúscula', withPassword('QUIJOTE#2026')],
      ['contraseña sin número', withPassword('Quijote#Rubio')],
      ['contraseña sin símbolo', withPassword('Quijote2026x')],
      ['contraseñas distintas', webPayload({ passwordConfirm: 'Otra#2026x' })],
      ['contraseña que no es string', webPayload({ password: 12345678 })],
      ['teléfono sin "+"', webPayload({ phone: '5512345678' })],
      ['teléfono con espacios', webPayload({ phone: '+52 55 1234 5678' })],
      ['teléfono demasiado corto', webPayload({ phone: '+52551234' })],
      ['teléfono demasiado largo', webPayload({ phone: '+5255123456789012' })],
      ['teléfono que no es string', webPayload({ phone: 5512345678 })],
      ['nombre de 51 caracteres', webPayload({ name: 'a'.repeat(51) })],
      ['apellido de 51 caracteres', webPayload({ lastname: 'a'.repeat(51) })],
      ['nombre vacío', webPayload({ name: '' })],
      ['email inválido', webPayload({ email: 'no-es-correo' })],
      [
        'email de 101 caracteres',
        webPayload({ email: `${'a'.repeat(60)}@${'b'.repeat(37)}.mx` }),
      ],
    ])('%s', async (_caso, body) => {
      await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('el email de 101 caracteres del caso anterior mide justo 101', () => {
      expect(`${'a'.repeat(60)}@${'b'.repeat(37)}.mx`).toHaveLength(101);
    });

    it.each([
      ['roleId (intentar crear un admin)', { roleId: 1 }],
      ['verified', { verified: true }],
      ['loginAttempts', { loginAttempts: 0 }],
      ['un campo cualquiera', { isAdmin: true }],
    ])('campo no permitido: %s', async (_caso, extra) => {
      await expect(validate(webPayload(extra))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('body vacío', async () => {
      await expect(validate({})).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('AuthService.SignUp', () => {
  it('no devuelve el hash de la contraseña ni los contadores de seguridad', async () => {
    const fila = {
      id: 12,
      name: 'Pedro',
      lastname: 'Rubio',
      email: 'pedro@elquijote.mx',
      phone: '+525512345678',
      password: '$2b$10$hashQueNoDebeSalir',
      verified: false,
      loginAttempts: 0,
      loginLockUntil: 0,
      recoveryAttempts: 0,
      recoveryLockUntil: 0,
      sessionTime: 0,
      roleId: 3,
      isActive: true,
      createdAt: '2026-10-19',
    };
    const db = {
      insert: () => ({
        values: () => ({ returning: () => Promise.resolve([fila]) }),
      }),
    };
    const service = new AuthService(
      db as never,
      { secret: 's', accessTokenTtl: '3600' },
      { hash: jest.fn().mockResolvedValue(fila.password) } as never,
      {} as never,
      {} as never,
    );

    const result = await service.SignUp(webPayload());

    expect(result).toMatchObject({ id: 12, email: 'pedro@elquijote.mx' });
    expect(JSON.stringify(result)).not.toContain('hashQueNoDebeSalir');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('loginAttempts');
  });
});
