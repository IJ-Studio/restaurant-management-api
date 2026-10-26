import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { createWhitelistPipe } from '../../common/config/validation.config';
import { UpdateUserDto } from './update-user.dto';

const validate = (value: unknown) =>
  createWhitelistPipe().transform(value, {
    type: 'body',
    metatype: UpdateUserDto,
  });

describe('UpdateUserDto con pipe de lista blanca', () => {
  it('acepta nombre, apellido y teléfono válidos', async () => {
    const result = (await validate({
      name: 'Ana',
      lastname: 'López',
      phone: '+525512345678',
    })) as UpdateUserDto;

    expect(result).toMatchObject({
      name: 'Ana',
      lastname: 'López',
      phone: '+525512345678',
    });
  });

  it('descarta roleId, password, isActive, verified y email', async () => {
    const result = (await validate({
      name: 'Ana',
      roleId: 1,
      password: 'sin-hash',
      isActive: false,
      verified: true,
      email: 'otra@quijote.mx',
    })) as UpdateUserDto;

    expect(result).toEqual({ name: 'Ana' });
  });

  it.each([
    ['sin "+"', '5512345678'],
    ['demasiado corto', '+52'],
    ['con espacios', '+52 55 1234 5678'],
  ])('rechaza teléfono %s', async (_caso, phone) => {
    await expect(validate({ phone })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza un nombre de más de 50 caracteres', async () => {
    await expect(validate({ name: 'x'.repeat(51) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza un nombre vacío', async () => {
    await expect(validate({ name: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
