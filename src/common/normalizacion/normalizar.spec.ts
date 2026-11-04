import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, validate } from 'class-validator';

import {
  Correo,
  Texto,
  TextoNegocio,
  correo,
  limpiarTexto,
  textoNegocio,
} from './normalizar';
import { NormalizarPipe } from './normalizar.pipe';

class Ejemplo {
  @TextoNegocio() @IsOptional() @IsString() nombre?: string | null;
  @Correo() @IsOptional() @IsString() email?: string | null;
  @Texto() @IsOptional() @IsString() notas?: string | null;
  @IsOptional() @IsString() password?: string;
}

describe('normalización de textos', () => {
  it('recorta, junta espacios, quita invisibles y deja null lo vacío', () => {
    expect(limpiarTexto('  Hola​   mundo \u0007 ')).toBe('Hola mundo');
    expect(limpiarTexto(' línea 1  \n   línea 2 ')).toBe('línea 1\nlínea 2');
    expect(limpiarTexto('   ')).toBeNull();
    expect(limpiarTexto(5)).toBe(5);
  });

  it('negocio en mayúsculas (con acentos y ñ) y correos en minúsculas', () => {
    expect(textoNegocio(' josé  peña ')).toBe('JOSÉ PEÑA');
    expect(correo('  Ana.Lopez@Correo.MX ')).toBe('ana.lopez@correo.mx');
  });

  it('los decoradores actúan antes de validar y no tocan la contraseña', async () => {
    const dto = plainToInstance(Ejemplo, {
      nombre: ' maría ',
      email: ' A@B.MX',
      notas: '  ',
      password: '  Secreta1 ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toEqual({
      nombre: 'MARÍA',
      email: 'a@b.mx',
      notas: null,
      password: '  Secreta1 ',
    });
  });
});

describe('NormalizarPipe', () => {
  const pipe = new NormalizarPipe();
  it('normaliza el cuerpo sin quitar campos de más', () => {
    const r = pipe.transform(
      { nombre: ' ana ', extra: ' tal cual ' },
      { type: 'body', metatype: Ejemplo },
    ) as Record<string, unknown>;
    expect(r.nombre).toBe('ANA');
    expect(r.extra).toBe(' tal cual ');
  });
  it('no toca parámetros, consultas ni cuerpos sin DTO', () => {
    expect(pipe.transform(' x ', { type: 'param', metatype: String })).toBe(
      ' x ',
    );
    const cuerpo = { nombre: ' ana ' };
    expect(pipe.transform(cuerpo, { type: 'body', metatype: Object })).toBe(
      cuerpo,
    );
  });
  it('con obligatorio, el vacío se queda en cadena vacía', () => {
    class Requerido {
      @TextoNegocio({ obligatorio: true }) nombre!: string;
    }
    const r = pipe.transform(
      { nombre: '   ' },
      { type: 'body', metatype: Requerido },
    ) as Requerido;
    expect(r.nombre).toBe('');
  });
});
