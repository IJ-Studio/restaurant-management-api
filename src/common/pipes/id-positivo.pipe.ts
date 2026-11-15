import {
  ArgumentMetadata,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';

/** Entero de 1 a 2^31-1 (columnas integer de Postgres): -1, 0, decimales o desbordados → 400. */
export class IdPositivoPipe extends ParseIntPipe {
  constructor(private readonly mensaje = 'El identificador no es válido.') {
    super({ exceptionFactory: () => new BadRequestException(mensaje) });
  }

  async transform(valor: string, meta: ArgumentMetadata): Promise<number> {
    const n = await super.transform(valor, meta);
    if (n < 1 || n > 2_147_483_647) throw new BadRequestException(this.mensaje);
    return n;
  }
}
