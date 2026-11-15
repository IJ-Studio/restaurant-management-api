import { BadRequestException } from '@nestjs/common';

import { IdPositivoPipe } from './id-positivo.pipe';

describe('IdPositivoPipe', () => {
  const pipe = new IdPositivoPipe('El platillo no es válido.');
  const meta = { type: 'param' as const };

  it.each(['1', '42', '2147483647'])('acepta %s', async (v) => {
    await expect(pipe.transform(v, meta)).resolves.toBe(Number(v));
  });

  it.each(['0', '-1', '1.5', 'abc', '2147483648', '99999999999999999999', ''])(
    'rechaza «%s» con 400 y su mensaje',
    async (v) => {
      const error = await pipe.transform(v, meta).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe(
        'El platillo no es válido.',
      );
    },
  );
});
