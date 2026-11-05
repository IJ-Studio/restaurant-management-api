import { randomBytes } from 'node:crypto';

import { cifrar, descifrar, estaCifrado, indiceCiego } from './cifrado';

const v1 = randomBytes(32).toString('base64');
const v2 = randomBytes(32).toString('base64');

describe('cifrado de campos sensibles', () => {
  const entorno = { ...process.env };
  beforeEach(() => {
    process.env.CIFRADO_CLAVES = `1:${v1},2:${v2}`;
    process.env.CIFRADO_VERSION = '1';
    process.env.CIFRADO_ESCRIBIR = 'true';
    process.env.CIFRADO_HMAC_CLAVE = randomBytes(32).toString('base64');
  });
  afterAll(() => {
    process.env = entorno;
  });

  it('cifra y descifra; cada cifrado es distinto (IV aleatorio)', () => {
    const a = cifrar('+527711234567');
    const b = cifrar('+527711234567');
    expect(estaCifrado(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(descifrar(a)).toBe('+527711234567');
  });

  it('sin CIFRADO_ESCRIBIR guarda en claro, y la lectura acepta valores en claro', () => {
    process.env.CIFRADO_ESCRIBIR = 'false';
    expect(cifrar('XAXX010101000')).toBe('XAXX010101000');
    expect(descifrar('XAXX010101000')).toBe('XAXX010101000');
  });

  it('rotación: descifra con la versión de cada valor', () => {
    const viejo = cifrar('CALLE 1');
    process.env.CIFRADO_VERSION = '2';
    const nuevo = cifrar('CALLE 1');
    expect(nuevo.startsWith('enc:v2:')).toBe(true);
    expect(descifrar(viejo)).toBe('CALLE 1');
    expect(descifrar(nuevo)).toBe('CALLE 1');
  });

  it('un valor manipulado no se descifra', () => {
    const c = cifrar('dato');
    const roto = c.slice(0, -2) + (c.endsWith('A') ? 'B' : 'A') + c.slice(-1);
    expect(() => descifrar(roto)).toThrow();
  });

  it('no cifra dos veces y el índice ciego es estable', () => {
    const c = cifrar('dato');
    expect(cifrar(c)).toBe(c);
    expect(indiceCiego(' xaxx010101000 ')).toBe(indiceCiego('XAXX010101000'));
  });

  it('una clave que no mide 32 bytes es un error de configuración', () => {
    process.env.CIFRADO_CLAVES = '1:corta';
    expect(() => cifrar('x')).toThrow(/32 bytes/);
  });
});
