import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(headers: Record<string, string> = {}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  const response = { status, setHeader };
  const request = { headers };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json, setHeader };
}

const bodyOf = (json: jest.Mock): Record<string, unknown> =>
  (json.mock.calls[0] as [Record<string, unknown>])[0];

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('400 de validación: code, details y requestId del header', () => {
    const { host, status, json, setHeader } = createHost({
      'x-request-id': 'req-1',
    });

    filter.catch(
      new BadRequestException({
        message: ['name should not be empty', 'phone must be a string'],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos.',
        details: ['«name» es obligatorio.', '«phone» debe ser texto.'],
        requestId: 'req-1',
      }),
    );
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-1');
  });

  it('404 con el formato único', () => {
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException('La orden no existe.'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'La orden no existe.',
      }),
    );
    expect(bodyOf(json).requestId).toEqual(expect.any(String));
  });

  it('23505 → 409 sin filtrar el detalle de la base', () => {
    const { host, status, json } = createHost();
    const error = Object.assign(
      new Error(
        'duplicate key value violates unique constraint "users_email_key"',
      ),
      { code: '23505' },
    );

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'CONFLICT' }),
    );
    expect(JSON.stringify(bodyOf(json))).not.toContain('users_email_key');
  });

  it('23503 envuelto en cause → 422', () => {
    const { host, status, json } = createHost();
    const error = Object.assign(new Error('DrizzleQueryError'), {
      cause: { code: '23503' },
    });

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422 }),
    );
  });

  it('error desconocido → 500 genérico, sin mensaje ni stack original', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('password=secreto detalle de la BD'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor.',
      }),
    );
    expect(JSON.stringify(bodyOf(json))).not.toContain('secreto');
  });

  it('429 agrega Retry-After', () => {
    const { host, status, setHeader } = createHost();

    filter.catch(new HttpException('Too Many Requests', 429), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });

  describe('datos imposibles nunca dan 500', () => {
    // Drizzle envuelve el error de Postgres en `cause`.
    const pg = (code: string) =>
      Object.assign(new Error('Failed query'), { cause: { code } });

    it.each([
      ['22P02', 'id «abc» en una columna entera'],
      ['22003', 'número fuera de rango'],
      ['22021', 'byte nulo en un texto'],
      ['22001', 'texto más largo que la columna'],
      ['22007', 'fecha con formato imposible'],
    ])('Postgres %s (%s) → 400', (code) => {
      const { host, status, json } = createHost();
      filter.catch(pg(code), host);
      expect(status).toHaveBeenCalledWith(400);
      expect(bodyOf(json).code).toBe('VALIDATION_ERROR');
      expect(String(bodyOf(json).message)).not.toContain('Failed query');
    });

    it('23502 (falta un dato obligatorio) → 400', () => {
      const { host, status, json } = createHost();
      filter.catch(pg('23502'), host);
      expect(status).toHaveBeenCalledWith(400);
      expect(bodyOf(json).message).toBe('Falta un dato obligatorio.');
    });

    it('Stripe: método inválido → 400 y tarjeta rechazada → 402', () => {
      const a = createHost();
      filter.catch(
        Object.assign(new Error("No such PaymentMethod: 'x'"), {
          type: 'StripeInvalidRequestError',
        }),
        a.host,
      );
      expect(a.status).toHaveBeenCalledWith(400);
      expect(String(bodyOf(a.json).message)).not.toContain('PaymentMethod');
      const b = createHost();
      filter.catch(
        Object.assign(new Error('card_declined'), { type: 'StripeCardError' }),
        b.host,
      );
      expect(b.status).toHaveBeenCalledWith(402);
    });
  });

  it('429 en español', () => {
    const { host, json } = createHost();
    filter.catch(
      new HttpException('ThrottlerException: Too Many Requests', 429),
      host,
    );
    expect(bodyOf(json).message).toBe(
      'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
    );
  });

  it('traduce el campo extra y los mensajes por defecto de class-validator', () => {
    const { host, json } = createHost();
    filter.catch(
      new BadRequestException({
        message: [
          'property rol should not exist',
          'cantidad must not be greater than 99',
          'Mensaje propio en español',
        ],
      }),
      host,
    );
    expect(bodyOf(json).details).toEqual([
      'El campo «rol» no está permitido.',
      '«cantidad» no puede ser mayor que 99.',
      'Mensaje propio en español',
    ]);
  });
});
