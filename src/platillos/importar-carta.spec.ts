import { normalizarEncabezado, planear } from './importar-carta';

const ACTUALES = [
  {
    id: 1,
    codigo: 'ENT-01',
    nombre: 'GUACAMOLE CON TOTOPOS',
    disponible: true,
  },
  { id: 2, codigo: null, nombre: 'ENCHILADAS HUASTECAS', disponible: true },
  { id: 3, codigo: null, nombre: 'MOLE DE OLLA', disponible: false },
  { id: 4, codigo: null, nombre: 'ZACAHUIL', disponible: true },
];
const CATEGORIAS = ['ENTRADAS', 'PLATOS FUERTES', 'BEBIDAS'];
const ENCABEZADOS = [
  'Código',
  'Nombre',
  'Categoría',
  'Precio',
  'Descripción',
  'Disponible',
  'Imagen URL',
  'Tiempo',
];

describe('normalizarEncabezado', () => {
  it.each([
    ['Categoría', 'categoria'],
    ['Imagen URL', 'imagen_url'],
    ['  Precio ', 'precio'],
    ['Tiempo', 'tiempo_preparacion'],
    ['Código', 'codigo'],
  ])('%s → %s', (entrada, salida) => {
    expect(normalizarEncabezado(entrada)).toBe(salida);
  });
});

describe('planear (importar carta)', () => {
  it('empata por código o por nombre sin distinguir acentos ni mayúsculas, y separa nuevos de actualizados', () => {
    const plan = planear(
      ENCABEZADOS,
      [
        ['ENT-01', 'Guacamole', 'Entradas', '99', '', 'sí', '', '10'],
        [
          '',
          'Enchiladas huastecas',
          'Platos fuertes',
          '$170.00',
          'Con cecina',
          'si',
          '',
          '',
        ],
        ['', 'Agua de horchata', 'Bebidas', '35', '', 'sí', '', ''],
      ],
      ACTUALES,
      CATEGORIAS,
      'agregar',
    );

    expect(plan.errores).toEqual([]);
    expect(
      plan.actualizados.map((f) => [f.existenteId, f.nombre, f.precio]),
    ).toEqual([
      [1, 'GUACAMOLE', 99],
      [2, 'ENCHILADAS HUASTECAS', 170],
    ]);
    expect(plan.nuevos.map((f) => f.nombre)).toEqual(['AGUA DE HORCHATA']);
    expect(plan.deshabilitar).toEqual([]);
  });

  it('reemplazar deshabilita (no borra) lo que no viene y no cuenta lo ya deshabilitado', () => {
    const plan = planear(
      ['nombre', 'categoria', 'precio'],
      [['Guacamole con totopos', 'Entradas', '95']],
      ACTUALES,
      CATEGORIAS,
      'reemplazar',
    );

    expect(plan.deshabilitar).toEqual([
      { id: 2, nombre: 'ENCHILADAS HUASTECAS' },
      { id: 4, nombre: 'ZACAHUIL' },
    ]);
  });

  it('un platillo que viene con error no se deshabilita en reemplazar', () => {
    const plan = planear(
      ['nombre', 'categoria', 'precio'],
      [
        ['Guacamole con totopos', 'Entradas', '95'],
        ['Zacahuil', 'Platos fuertes', 'gratis'],
      ],
      ACTUALES,
      CATEGORIAS,
      'reemplazar',
    );

    expect(plan.errores).toEqual([
      { fila: 3, mensaje: 'Zacahuil: precio no válido («gratis»).' },
    ]);
    expect(plan.deshabilitar.map((p) => p.id)).toEqual([2]);
  });

  it('detecta filas sin nombre, sin categoría, repetidas y con imagen sin https', () => {
    const plan = planear(
      ['nombre', 'categoria', 'precio', 'imagen_url'],
      [
        ['', 'Entradas', '10', ''],
        ['Sopa', '', '50', ''],
        ['Tacos', 'Entradas', '60', 'http://inseguro.mx/a.jpg'],
        ['Tacos', 'Entradas', '60', ''],
      ],
      [],
      CATEGORIAS,
      'agregar',
    );

    expect(plan.errores.map((e) => e.fila)).toEqual([2, 3, 4, 5]);
    expect(plan.errores[3].mensaje).toContain('repetido en el archivo');
    expect(plan.nuevos).toEqual([]);
  });

  it('sin columnas obligatorias no hay plan', () => {
    const plan = planear(
      ['nombre', 'precio'],
      [['Tacos', '60']],
      ACTUALES,
      CATEGORIAS,
      'reemplazar',
    );

    expect(plan.errores).toEqual([
      { fila: null, mensaje: 'Faltan columnas obligatorias: categoria.' },
    ]);
    expect(plan.deshabilitar).toEqual([]);
  });

  it('plantilla incompleta: avisa qué columnas faltan (esos datos no se cambian) y no las incluye en la actualización', () => {
    const plan = planear(
      ['nombre', 'categoria', 'precio'],
      [['Zacahuil', 'Platos fuertes', '150']],
      ACTUALES,
      CATEGORIAS,
      'agregar',
    );

    expect(plan.avisos.map((a) => a.mensaje)).toContain(
      'La plantilla no trae la columna «descripcion»: ese dato no se cambia.',
    );
    expect(plan.actualizados[0]).not.toHaveProperty('descripcion');
    expect(plan.actualizados[0]).not.toHaveProperty('imagenUrl');
  });

  it('crea las categorías que no existen y acepta «no» como no disponible', () => {
    const plan = planear(
      ['nombre', 'categoria', 'precio', 'disponible'],
      [
        ['Pan de elote', 'Postres', '45', 'no'],
        ['Flan', 'postres', '40', 'quizá'],
      ],
      [],
      CATEGORIAS,
      'agregar',
    );

    expect(plan.categoriasNuevas).toEqual(['POSTRES']);
    expect(plan.nuevos.map((f) => f.disponible)).toEqual([false, true]);
    expect(
      plan.avisos.some((a) => a.fila === 3 && a.mensaje.includes('quizá')),
    ).toBe(true);
  });
});
