import { BadRequestException } from '@nestjs/common';

import { AuthService, SIGN_UP_FAILED_MESSAGE } from './auth.service';
import type { SignUpDto } from './dto/sign-up.dto';

const dto = {
  name: 'Pedro',
  lastname: 'Rubio',
  email: 'pedro@elquijote.mx',
  phone: '+525512345678',
  password: 'Quijote#2026x',
  passwordConfirm: 'Quijote#2026x',
} as SignUpDto;

/** Servicio cuyo INSERT falla con el error indicado. */
function serviceWhoseInsertFails(error: Error) {
  const hash = jest.fn().mockResolvedValue('$2b$10$hash');
  const db = {
    insert: () => ({
      values: () => ({ returning: () => Promise.reject(error) }),
    }),
  };
  const service = new AuthService(
    db as never,
    { secret: 's', accessTokenTtl: 3600 },
    { hash } as never,
    {} as never,
    {} as never,
  );
  return { service, hash };
}

const postgresError = (code: string) =>
  Object.assign(new Error('error de postgres'), { code });

describe('AuthService.SignUp — correo ya registrado', () => {
  it('violación UNIQUE: responde 400 con un mensaje que no confirma que el correo exista', async () => {
    const { service } = serviceWhoseInsertFails(postgresError('23505'));

    const error: unknown = await service.SignUp(dto).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    const message = (error as BadRequestException).message;
    expect(message).toBe(SIGN_UP_FAILED_MESSAGE);
    expect(message).not.toMatch(/correo|email|existe|registrad/i);
  });

  it('Drizzle envuelve el error del driver: también se detecta en `cause`', async () => {
    const wrapped = Object.assign(new Error('Failed query'), {
      cause: postgresError('23505'),
    });
    const { service } = serviceWhoseInsertFails(wrapped);

    await expect(service.SignUp(dto)).rejects.toThrow(SIGN_UP_FAILED_MESSAGE);
  });

  it('calcula el hash aunque el correo exista (el tiempo de respuesta no lo delata)', async () => {
    const { service, hash } = serviceWhoseInsertFails(postgresError('23505'));

    await service.SignUp(dto).catch(() => undefined);

    expect(hash).toHaveBeenCalledWith(dto.password);
  });

  it.each([
    ['error de conexión', postgresError('08006')],
    ['violación de NOT NULL', postgresError('23502')],
    ['valor demasiado largo', postgresError('22001')],
    ['error cualquiera', new Error('boom')],
  ])(
    '%s: ya NO se disfraza de "el email ya existe"; el error sube tal cual (500)',
    async (_caso, error) => {
      const { service } = serviceWhoseInsertFails(error);

      const thrown: unknown = await service
        .SignUp(dto)
        .catch((e: unknown) => e);

      expect(thrown).toBe(error);
      expect(thrown).not.toBeInstanceOf(BadRequestException);
    },
  );

  it('contraseñas distintas: sigue siendo 400 y no toca la base de datos', async () => {
    const { service, hash } = serviceWhoseInsertFails(
      new Error('no debe llegar'),
    );

    await expect(
      service.SignUp({ ...dto, passwordConfirm: 'Otra#2026x' }),
    ).rejects.toThrow('Las contraseñas no coinciden');
    expect(hash).not.toHaveBeenCalled();
  });
});
