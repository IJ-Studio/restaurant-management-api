import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { createGlobalValidationPipe } from '../../common/config/validation.config';
import { CreateOrderMesaDto } from './create-order-mesa.dto';

const validate = (value: unknown) =>
  createGlobalValidationPipe().transform(value, {
    type: 'body',
    metatype: CreateOrderMesaDto,
  });

describe('CreateOrderMesaDto con ValidationPipe global', () => {
  it('rechaza una cantidad negativa', async () => {
    await expect(
      validate({
        mesa: '1',
        platilloId: 1,
        cantidad: -2,
        usuarioId: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza campos que no están en el DTO', async () => {
    await expect(
      validate({
        mesa: '1',
        items: [{ platilloId: 1, cantidad: 1 }],
        usuarioId: 7,
        roleId: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
