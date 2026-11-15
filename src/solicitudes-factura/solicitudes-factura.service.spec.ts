import { BadRequestException, ConflictException } from '@nestjs/common';

import { CorreoService } from '../correo/correo.service';
import {
  MENSAJES,
  SolicitudesFacturaService,
} from './solicitudes-factura.service';

/** Base falsa: cada consulta (`select` o `insert … returning`) toma la siguiente respuesta de la fila. */
function setup(respuestas: unknown[][]) {
  const cola = [...respuestas];
  const siguiente = () => Promise.resolve(cola.shift() ?? []);
  const cadena = (): Record<string, unknown> => {
    const c: Record<string, unknown> = {};
    for (const m of [
      'from',
      'where',
      'innerJoin',
      'orderBy',
      'values',
      'onConflictDoUpdate',
      'set',
    ]) {
      c[m] = jest.fn(() => c);
    }
    c.limit = jest.fn(siguiente);
    c.returning = jest.fn(siguiente);
    (c as { then: PromiseLike<unknown>['then'] }).then = (ok, mal) =>
      siguiente().then(ok, mal);
    return c;
  };
  const updates: unknown[] = [];
  const db = {
    select: jest.fn(cadena),
    insert: jest.fn(cadena),
    update: jest.fn(() => {
      const c = cadena();
      c.set = jest.fn((datos: unknown) => {
        updates.push(datos);
        return c;
      });
      return c;
    }),
  };
  const pagos = {
    crearFactura: jest.fn().mockResolvedValue({ id: 'fac-1', folio: 'A-12' }),
  };
  const correo = {
    enviarFactura: jest
      .fn()
      .mockResolvedValue({ enviado: false, motivo: 'apagado' }),
  };
  const servicio = new SolicitudesFacturaService(
    db as never,
    pagos as never,
    correo as never,
  );
  return { servicio, pagos, correo, updates };
}

const DTO = {
  ordenId: 'o-1',
  rfc: 'XAXX010101000',
  razonSocial: 'ANA',
  email: 'ana@correo.mx',
};

describe('SolicitudesFacturaService', () => {
  it('registra la solicitud de una orden propia aunque aún no esté pagada', async () => {
    const { servicio } = setup([
      [{ id: 'o-1', clienteId: 'c-7' }],
      [{ id: 'c-7' }],
      [{ id: 1, estatus: 'pendiente' }],
    ]);

    await expect(servicio.solicitar(DTO as never, 7)).resolves.toEqual({
      id: 1,
      estatus: 'pendiente',
      mensaje: MENSAJES.registrada,
    });
  });

  it('rechaza la orden de otro cliente', async () => {
    const { servicio } = setup([
      [{ id: 'o-1', clienteId: 'c-9' }],
      [{ id: 'c-7' }],
    ]);

    await expect(servicio.solicitar(DTO as never, 7)).rejects.toThrow(
      new BadRequestException(MENSAJES.noEsTuya),
    );
  });

  it('no cambia una solicitud ya atendida (409)', async () => {
    const { servicio } = setup([
      [{ id: 'o-1', clienteId: 'c-7' }],
      [{ id: 'c-7' }],
      [],
    ]);

    await expect(servicio.solicitar(DTO as never, 7)).rejects.toThrow(
      ConflictException,
    );
  });

  it('emite la factura a nombre del cliente, marca la solicitud y prepara el correo', async () => {
    const { servicio, pagos, correo, updates } = setup([
      [
        {
          id: 1,
          ordenId: 'o-1',
          usuarioId: 7,
          estatus: 'pendiente',
          datos: {
            rfc: 'XAXX010101000',
            razonSocial: 'ANA',
            email: 'ana@correo.mx',
          },
        },
      ],
      [{ estatus: 'pagada' }],
      [{ id: 1 }],
    ]);

    const resultado = await servicio.emitir(1, 99);

    expect(pagos.crearFactura).toHaveBeenCalledWith(
      {
        rfc: 'XAXX010101000',
        razonSocial: 'ANA',
        email: 'ana@correo.mx',
        ordenId: 'o-1',
      },
      7,
      { deCola: true },
    );
    expect(updates[0]).toMatchObject({ atendidaPor: 99 });
    expect(updates[1]).toMatchObject({
      estatus: 'emitida',
      facturaId: 'fac-1',
      atendidaPor: 99,
    });
    expect(correo.enviarFactura).toHaveBeenCalledWith({
      para: 'ana@correo.mx',
      nombre: 'ANA',
      folio: 'A-12',
    });
    expect(resultado).toEqual({
      facturaId: 'fac-1',
      folio: 'A-12',
      correo: { enviado: false, motivo: 'apagado' },
    });
  });

  it('no emite si el pago aún no está confirmado', async () => {
    const { servicio, pagos } = setup([
      [
        {
          id: 1,
          ordenId: 'o-1',
          usuarioId: 7,
          estatus: 'pendiente',
          datos: {},
        },
      ],
      [{ estatus: 'entregada' }],
    ]);

    await expect(servicio.emitir(1, 99)).rejects.toThrow(MENSAJES.sinPago);
    expect(pagos.crearFactura).not.toHaveBeenCalled();
  });

  const PENDIENTE = {
    id: 1,
    ordenId: 'o-1',
    usuarioId: 7,
    estatus: 'pendiente',
    datos: {},
  };

  it('dos administradores a la vez: solo uno timbra, el otro recibe 409', async () => {
    const { servicio, pagos } = setup([
      [PENDIENTE],
      [{ estatus: 'pagada' }],
      [],
    ]);

    await expect(servicio.emitir(1, 98)).rejects.toThrow(MENSAJES.enCurso);
    expect(pagos.crearFactura).not.toHaveBeenCalled();
  });

  it('si Facturapi rechaza los datos, la solicitud queda libre para corregir y reintentar', async () => {
    const { servicio, pagos, updates } = setup([
      [PENDIENTE],
      [{ estatus: 'pagada' }],
      [{ id: 1 }],
    ]);
    pagos.crearFactura.mockRejectedValueOnce(
      new BadRequestException('RFC no registrado en el SAT'),
    );

    await expect(servicio.emitir(1, 99)).rejects.toThrow('RFC no registrado');
    expect(updates[1]).toEqual({ atendidaPor: null, atendidaEn: null });
  });

  it('caja pide la factura de una cuenta en mesa (sin cliente registrado)', async () => {
    const { servicio } = setup([
      [{ id: 'o-1', clienteId: null }],
      [{ id: 2, estatus: 'pendiente' }],
    ]);

    await expect(servicio.solicitar(DTO as never, 5, 2)).resolves.toMatchObject(
      { id: 2, estatus: 'pendiente' },
    );
  });

  it('no atiende dos veces la misma solicitud', async () => {
    const { servicio } = setup([[{ id: 1, estatus: 'emitida' }]]);

    await expect(servicio.emitir(1, 99)).rejects.toThrow(MENSAJES.yaAtendida);
  });

  it('rechaza con motivo y exige un motivo legible', async () => {
    const { servicio, updates } = setup([[{ id: 1, estatus: 'pendiente' }]]);

    await expect(servicio.rechazar(1, 'RFC', 99)).rejects.toThrow(
      MENSAJES.motivo,
    );
    await expect(
      servicio.rechazar(1, '  El RFC no coincide con el nombre  ', 99),
    ).resolves.toEqual({
      id: 1,
      estatus: 'rechazada',
    });
    expect(updates[0]).toMatchObject({
      estatus: 'rechazada',
      motivo: 'El RFC no coincide con el nombre',
    });
  });
});

describe('CorreoService (Brevo, apagado por defecto)', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  it('sin CORREO_ACTIVO no llama a Brevo', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    delete process.env.CORREO_ACTIVO;

    await expect(
      new CorreoService().enviarFactura({
        para: 'a@b.mx',
        nombre: 'A',
        folio: '1',
      }),
    ).resolves.toEqual({
      enviado: false,
      motivo: 'El envío por correo está desactivado.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('activo, manda el correo con la llave de Brevo y sin inyectar HTML', async () => {
    process.env.CORREO_ACTIVO = 'true';
    process.env.BREVO_API_KEY = 'llave-de-prueba';
    process.env.CORREO_REMITENTE = 'facturas@quijote.mx';
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }));

    await expect(
      new CorreoService().enviarFactura({
        para: 'a@b.mx',
        nombre: '<b>Ana</b>',
        folio: 'A-1',
        pdfBase64: 'JVBER',
      }),
    ).resolves.toEqual({ enviado: true });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'llave-de-prueba',
    );
    const body = JSON.parse(init.body as string) as {
      htmlContent: string;
      attachment: unknown[];
    };
    expect(body.htmlContent).not.toContain('<b>');
    expect(body.attachment).toHaveLength(1);
  });
});
