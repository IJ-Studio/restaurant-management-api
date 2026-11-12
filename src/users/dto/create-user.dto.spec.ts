import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { createStrictValidationPipe } from '../../common/config/validation.config';
import { CreateUserDto } from './create-user.dto';

const base = {
  name: 'Juan',
  lastname: 'Pérez',
  phone: '+525512345678',
  email: 'juan@quijote.mx',
  password: 'Pass#2026',
};

const validate = (value: unknown) =>
  createStrictValidationPipe().transform(value, {
    type: 'body',
    metatype: CreateUserDto,
  });

describe('CreateUserDto.roleId', () => {
  it.each([2, 3, 4, 5])('acepta el rol válido %i', async (roleId) => {
    await expect(validate({ ...base, roleId })).resolves.toMatchObject({
      roleId,
    });
  });

  it.each([1, 0, 6, 999])(
    'rechaza con 400 el rol inválido %i',
    async (roleId) => {
      await expect(validate({ ...base, roleId })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('permite omitir roleId (el servicio asigna cajero por defecto)', async () => {
    await expect(validate(base)).resolves.toBeDefined();
  });
});
