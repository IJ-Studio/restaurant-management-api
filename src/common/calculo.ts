/**
 * Desglose de una cifra («Ver cálculo», Prioridad 1.4): la fórmula, la operación que la produce y
 * cada dato usado, sacados de las mismas filas que dieron el resultado. Así el cliente lo muestra
 * tal cual y una prueba puede recalcular el resultado desde el desglose.
 *
 * - `suma`: resultado = suma de los valores (las restas van en negativo).
 * - `conteo`: resultado = número de datos (el valor de cada uno es descriptivo).
 * - `cociente`: resultado = primer valor / segundo valor.
 */
export type Operacion = 'suma' | 'conteo' | 'cociente';

export interface DatoCalculo {
  clave: string;
  valor: number | string;
  origen?: string;
}

export interface Calculo {
  formula: string;
  operacion: Operacion;
  datos: DatoCalculo[];
  periodo?: { inicio: string; fin: string };
  filtros?: Record<string, string | number | boolean | null>;
}

/** Centavos → pesos con dos decimales, como número. */
export const aPesos = (centavos: number) => Math.round(centavos) / 100;

/** Rehace el resultado desde el desglose (lo usan las pruebas para comprobar que cuadra). */
export function recalcular({ operacion, datos }: Calculo): number {
  if (operacion === 'conteo') return datos.length;
  const valores = datos.map((d) => Number(d.valor));
  if (operacion === 'cociente') return valores[1] ? valores[0] / valores[1] : 0;
  return Math.round(valores.reduce((s, v) => s + v * 100, 0)) / 100;
}
