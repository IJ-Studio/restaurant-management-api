import { ORIGENES_POR_DEFECTO, origenesCors } from './cors';

describe('CORS_ORIGINS', () => {
  it('sin variable, los orígenes de siempre', () => {
    expect(origenesCors(undefined)).toEqual(ORIGENES_POR_DEFECTO);
    expect(origenesCors('  ')).toEqual(ORIGENES_POR_DEFECTO);
  });
  it('lista separada por comas, sin barra final y descartando lo que no es un origen', () => {
    expect(
      origenesCors(
        'https://a.mx/, http://localhost:3100 , javascript:alert(1), *',
      ),
    ).toEqual(['https://a.mx', 'http://localhost:3100']);
  });
});
