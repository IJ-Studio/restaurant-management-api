/**
 * Importación de la carta desde la plantilla en español (Fase 4.2). Funciones puras: leen las
 * filas, las comparan con la carta actual y devuelven el plan. Nada se escribe aquí.
 */
export type ModoImportacion = 'agregar' | 'reemplazar';

export interface PlatilloActual {
  id: number;
  codigo: string | null;
  nombre: string;
  disponible: boolean | null;
}

export interface FilaValida {
  fila: number;
  codigo: string | null;
  nombre: string;
  categoria: string;
  precio: number;
  descripcion?: string | null;
  disponible: boolean;
  imagenUrl?: string | null;
  tiempoPreparacion?: number | null;
  /** Id del platillo existente que se actualiza; `null` si es nuevo. */
  existenteId: number | null;
}

export interface Problema {
  fila: number | null;
  mensaje: string;
}

export interface PlanImportacion {
  nuevos: FilaValida[];
  actualizados: FilaValida[];
  /** Platillos que no vienen en el archivo y quedarán deshabilitados (solo en `reemplazar`). */
  deshabilitar: { id: number; nombre: string }[];
  categoriasNuevas: string[];
  avisos: Problema[];
  errores: Problema[];
  /** Columnas opcionales presentes: las ausentes no se tocan al actualizar. */
  columnas: string[];
}

export const OBLIGATORIAS = ['nombre', 'categoria', 'precio'] as const;
export const OPCIONALES = [
  'codigo',
  'descripcion',
  'disponible',
  'imagen_url',
  'tiempo_preparacion',
] as const;
export const PLANTILLA = [
  ...['codigo', 'nombre', 'categoria', 'precio'],
  'descripcion',
  'disponible',
  'imagen_url',
  'tiempo_preparacion',
];

const ALIAS: Record<string, string> = {
  clave: 'codigo',
  platillo: 'nombre',
  imagen: 'imagen_url',
  foto: 'imagen_url',
  tiempo: 'tiempo_preparacion',
  minutos: 'tiempo_preparacion',
};

/** «Categoría» → «categoria»; «Imagen URL» → «imagen_url». */
export function normalizarEncabezado(encabezado: string): string {
  const base = encabezado
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return ALIAS[base] ?? base;
}

const clave = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const SI = ['si', 'sí', '1', 'true', 'x', 'disponible'];
const NO = ['no', '0', 'false', 'agotado', 'deshabilitado'];

export function planear(
  encabezados: string[],
  filas: string[][],
  actuales: PlatilloActual[],
  categoriasActuales: string[],
  modo: ModoImportacion,
): PlanImportacion {
  const columnas = encabezados.map(normalizarEncabezado);
  const errores: Problema[] = [];
  const avisos: Problema[] = [];
  const faltan = OBLIGATORIAS.filter((c) => !columnas.includes(c));
  if (faltan.length) {
    errores.push({
      fila: null,
      mensaje: `Faltan columnas obligatorias: ${faltan.join(', ')}.`,
    });
    return {
      nuevos: [],
      actualizados: [],
      deshabilitar: [],
      categoriasNuevas: [],
      avisos,
      errores,
      columnas,
    };
  }
  for (const opcional of OPCIONALES) {
    if (!columnas.includes(opcional)) {
      avisos.push({
        fila: null,
        mensaje: `La plantilla no trae la columna «${opcional}»: ese dato no se cambia.`,
      });
    }
  }
  const desconocidas = columnas.filter(
    (c) =>
      !(OBLIGATORIAS as readonly string[]).includes(c) &&
      !(OPCIONALES as readonly string[]).includes(c),
  );
  if (desconocidas.length)
    avisos.push({
      fila: null,
      mensaje: `Se ignoran las columnas: ${desconocidas.join(', ')}.`,
    });

  const porCodigo = new Map(
    actuales.filter((p) => p.codigo).map((p) => [clave(p.codigo as string), p]),
  );
  const porNombre = new Map(actuales.map((p) => [clave(p.nombre), p]));
  const categorias = new Set(categoriasActuales.map(clave));
  const categoriasNuevas = new Map<string, string>();
  const vistos = new Set<string>();
  const tocados = new Set<number>();
  const nuevos: FilaValida[] = [];
  const actualizados: FilaValida[] = [];

  filas.forEach((celdas, i) => {
    const fila = i + 2; // la 1 es el encabezado
    const valor = (col: string) => {
      const idx = columnas.indexOf(col);
      return idx === -1 ? undefined : (celdas[idx] ?? '').trim();
    };
    if (celdas.every((c) => !c?.trim())) return;
    const nombre = valor('nombre') ?? '';
    const codigo = valor('codigo') || null;
    const existente =
      (codigo && porCodigo.get(clave(codigo))) ||
      porNombre.get(clave(nombre)) ||
      null;
    // Aunque la fila tenga error, el platillo que nombra no se deshabilita en «reemplazar».
    if (existente) tocados.add(existente.id);

    const problemas: string[] = [];
    if (!nombre) problemas.push('falta el nombre');
    const categoria = valor('categoria') ?? '';
    if (!categoria) problemas.push('falta la categoría');
    const precioTexto = (valor('precio') ?? '').replace(/[$,\s]/g, '');
    const precio = Number(precioTexto);
    if (
      !precioTexto ||
      !Number.isFinite(precio) ||
      precio <= 0 ||
      precio > 99999.99
    ) {
      problemas.push(`precio no válido («${valor('precio') ?? ''}»)`);
    }
    const idUnico = codigo ? `c:${clave(codigo)}` : `n:${clave(nombre)}`;
    if (nombre && vistos.has(idUnico)) problemas.push('repetido en el archivo');
    vistos.add(idUnico);

    let disponible = true;
    const disp = valor('disponible');
    if (disp) {
      if (NO.includes(clave(disp))) disponible = false;
      else if (!SI.includes(clave(disp)))
        avisos.push({
          fila,
          mensaje: `«${disp}» no es sí o no: queda disponible.`,
        });
    }
    const tiempoTexto = valor('tiempo_preparacion');
    let tiempoPreparacion: number | null | undefined;
    if (tiempoTexto !== undefined) {
      tiempoPreparacion = tiempoTexto ? Number(tiempoTexto) : null;
      if (
        tiempoPreparacion !== null &&
        (!Number.isInteger(tiempoPreparacion) || tiempoPreparacion < 0)
      ) {
        avisos.push({
          fila,
          mensaje: `Tiempo de preparación «${tiempoTexto}» no válido: se deja vacío.`,
        });
        tiempoPreparacion = null;
      }
    }
    const imagen = valor('imagen_url');
    if (imagen && !/^https:\/\//.test(imagen))
      problemas.push('la imagen debe ser una dirección https://');

    if (problemas.length) {
      errores.push({
        fila,
        mensaje: `${nombre || 'Fila sin nombre'}: ${problemas.join(', ')}.`,
      });
      return;
    }
    if (!categorias.has(clave(categoria)))
      categoriasNuevas.set(clave(categoria), categoria.toUpperCase());

    const plan: FilaValida = {
      fila,
      codigo,
      nombre: nombre.toUpperCase(),
      categoria: categoria.toUpperCase(),
      precio: Math.round(precio * 100) / 100,
      ...(valor('descripcion') !== undefined
        ? { descripcion: valor('descripcion') || null }
        : {}),
      disponible,
      ...(imagen !== undefined ? { imagenUrl: imagen || null } : {}),
      ...(tiempoPreparacion !== undefined ? { tiempoPreparacion } : {}),
      existenteId: existente?.id ?? null,
    };
    (existente ? actualizados : nuevos).push(plan);
  });

  const deshabilitar =
    modo === 'reemplazar'
      ? actuales
          .filter((p) => !tocados.has(p.id) && p.disponible !== false)
          .map((p) => ({ id: p.id, nombre: p.nombre }))
      : [];
  return {
    nuevos,
    actualizados,
    deshabilitar,
    categoriasNuevas: [...categoriasNuevas.values()],
    avisos,
    errores,
    columnas,
  };
}
