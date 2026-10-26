import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { createGlobalValidationPipe } from '../../common/config/validation.config';
import { CreateMenuOrderDto } from './create-menu-order.dto';

const validate = (value: unknown) =>
  createGlobalValidationPipe().transform(value, {
    type: 'body',
    metatype: CreateMenuOrderDto,
  });

const webPayload = (over: Record<string, unknown> = {}) => ({
  tipoPedido: 'mesa',
  productos: [{ platilloId: 1, cantidad: 2, precioUnitario: 120 }],
  ...over,
});

describe('CreateMenuOrderDto', () => {
  it('acepta el payload del menú', async () => {
    await expect(validate(webPayload())).resolves.toMatchObject({
      tipoPedido: 'mesa',
    });
  });

  it.each([0, -1])('rechaza cantidad %i', async (cantidad) => {
    await expect(
      validate(
        webPayload({
          productos: [{ platilloId: 1, cantidad, precioUnitario: 120 }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una orden sin productos', async () => {
    await expect(
      validate(webPayload({ productos: [] })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza campos que no están en el DTO', async () => {
    await expect(validate(webPayload({ usuarioId: 1 }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
