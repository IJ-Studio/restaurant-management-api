import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';

import { DRIZZLE } from '../database/drizzle/constants';
import type { DrizzleDB } from '../database/drizzle/drizzle.provider';
import { categoriasMenu, platillos } from '../database/schema/public.schema';
import {
  planear,
  PLANTILLA,
  type ModoImportacion,
  type PlanImportacion,
} from './importar-carta';
import { parseCsv } from './platillos.service';

export interface ResultadoImportacion extends PlanImportacion {
  aplicado: boolean;
}

const MAX_FILAS = 2000;
// Marca de orden de bytes que Excel pone al guardar CSV en UTF-8.
const BOM = new RegExp(`^${String.fromCharCode(0xfeff)}`);

/** Valor de una celda de Excel como texto (las celdas con formato llegan como objeto con `text`). */
function celda(valor: unknown): string {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean')
    return `${valor}`;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (valor && typeof valor === 'object') {
    if ('text' in valor) return celda(valor.text);
    if ('result' in valor) return celda(valor.result);
  }
  // Vacía, fórmula sin resultado u otro objeto: la celda se trata como vacía.
  return '';
}

/** Importar la carta desde Excel o CSV (Fase 4.2): vista previa y aplicación en una transacción. */
@Injectable()
export class ImportarCartaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  plantillaCsv(): string {
    const ejemplo = [
      'ENT-01',
      'Guacamole con totopos',
      'Entradas',
      '95.00',
      'Aguacate, jitomate y cilantro',
      'sí',
      '',
      '10',
    ];
    return `${PLANTILLA.join(',')}\n${ejemplo.map((v) => (v.includes(',') ? `"${v}"` : v)).join(',')}\n`;
  }

  async leer(archivo: {
    originalname: string;
    buffer: Buffer;
  }): Promise<{ encabezados: string[]; filas: string[][] }> {
    const nombre = archivo.originalname.toLowerCase();
    if (nombre.endsWith('.csv')) {
      const { headers, rows } = parseCsv(
        archivo.buffer.toString('utf-8').replace(BOM, ''),
      );
      return { encabezados: headers, filas: rows };
    }
    if (nombre.endsWith('.xlsx')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- así lo carga el resto del módulo
      const ExcelJS = require('exceljs') as typeof import('exceljs');
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.load(archivo.buffer as unknown as ArrayBuffer);
      const hoja = libro.worksheets[0];
      if (!hoja) throw new BadRequestException('El Excel no tiene hojas.');
      const filas: string[][] = [];
      hoja.eachRow({ includeEmpty: false }, (fila) => {
        const valores = (fila.values as unknown[]).slice(1);
        filas.push(valores.map(celda));
      });
      return { encabezados: filas[0] ?? [], filas: filas.slice(1) };
    }
    throw new BadRequestException('El archivo debe ser .xlsx o .csv.');
  }

  async importar(
    archivo: { originalname: string; buffer: Buffer },
    modo: ModoImportacion,
    confirmar: boolean,
    forzar: boolean,
  ): Promise<ResultadoImportacion> {
    const { encabezados, filas } = await this.leer(archivo);
    if (filas.length > MAX_FILAS)
      throw new BadRequestException(`Máximo ${MAX_FILAS} filas por archivo.`);
    const actuales = await this.db
      .select({
        id: platillos.id,
        codigo: platillos.codigo,
        nombre: platillos.nombre,
        disponible: platillos.disponible,
      })
      .from(platillos);
    const categorias = await this.db
      .select({ id: categoriasMenu.id, nombre: categoriasMenu.nombre })
      .from(categoriasMenu);
    const plan = planear(
      encabezados,
      filas,
      actuales,
      categorias.map((c) => c.nombre),
      modo,
    );

    if (!confirmar) return { ...plan, aplicado: false };
    const sinColumnas = plan.errores.some((e) => e.fila === null);
    if (sinColumnas) throw new BadRequestException(plan.errores[0].mensaje);
    if (plan.errores.length && !forzar) {
      throw new BadRequestException(
        'Hay filas con errores. Corrígelas o usa «Importar de todas formas».',
      );
    }

    await this.db.transaction(async (tx) => {
      const idCategoria = new Map(
        categorias.map((c) => [c.nombre.toUpperCase(), c.id]),
      );
      if (plan.categoriasNuevas.length) {
        const creadas = await tx
          .insert(categoriasMenu)
          .values(plan.categoriasNuevas.map((nombre) => ({ nombre })))
          .returning({ id: categoriasMenu.id, nombre: categoriasMenu.nombre });
        for (const c of creadas) idCategoria.set(c.nombre.toUpperCase(), c.id);
      }
      const datos = (f: (typeof plan.nuevos)[number]) => ({
        nombre: f.nombre,
        categoriaId: idCategoria.get(f.categoria) as number,
        precio: f.precio.toFixed(2),
        disponible: f.disponible,
        ...(f.codigo ? { codigo: f.codigo } : {}),
        ...(f.descripcion !== undefined ? { descripcion: f.descripcion } : {}),
        ...(f.imagenUrl !== undefined ? { imagenUrl: f.imagenUrl } : {}),
        ...(f.tiempoPreparacion !== undefined
          ? { tiempoPreparacion: f.tiempoPreparacion }
          : {}),
      });
      if (plan.nuevos.length)
        await tx.insert(platillos).values(plan.nuevos.map(datos));
      for (const f of plan.actualizados) {
        await tx
          .update(platillos)
          .set(datos(f))
          .where(eq(platillos.id, f.existenteId as number));
      }
      // Nunca se borran: quedan deshabilitados y se pueden volver a activar.
      if (plan.deshabilitar.length) {
        await tx
          .update(platillos)
          .set({ disponible: false })
          .where(
            inArray(
              platillos.id,
              plan.deshabilitar.map((p) => p.id),
            ),
          );
      }
    });
    return { ...plan, aplicado: true };
  }
}
