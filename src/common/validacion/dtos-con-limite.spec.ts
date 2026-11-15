import 'reflect-metadata';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getMetadataStorage } from 'class-validator';

/**
 * Guarda automática (DV-15): todo campo de texto de un DTO tiene un límite de longitud o un formato
 * cerrado. Un DTO nuevo sin límite hace fallar esta prueba, así que los futuros también cumplen.
 */
const ACOTAN = new Set([
  'maxLength',
  'length',
  'isLength',
  'matches',
  'isIn',
  'isEnum',
  'isUUID',
  'isUuid',
  'isDateString',
  'isISO8601',
  'isBooleanString',
]);

function archivosDto(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return archivosDto(p);
    return /\.dto\.ts$/.test(n) ? [p] : [];
  });
}

describe('DTO: todo texto tiene límite (DV-15)', () => {
  const meta = getMetadataStorage();
  const clases = archivosDto(join(__dirname, '..', '..')).flatMap((f) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.values(require(f) as Record<string, unknown>).filter(
      (v): v is new () => object =>
        typeof v === 'function' && !/Response(Dto)?$/.test(v.name),
    ),
  );

  it('encuentra los DTO', () => expect(clases.length).toBeGreaterThan(30));

  it('ningún campo de texto queda sin límite', () => {
    const sinLimite: string[] = [];
    for (const clase of clases) {
      const reglas = meta.getTargetValidationMetadatas(clase, '', true, false);
      const porCampo = new Map<string, Set<string>>();
      for (const r of reglas) {
        const nombre =
          r.name ??
          meta.getTargetValidatorConstraints(r.constraintCls)[0]?.name ??
          '';
        const set = porCampo.get(r.propertyName) ?? new Set<string>();
        set.add(nombre);
        porCampo.set(r.propertyName, set);
      }
      for (const [campo, nombres] of porCampo) {
        // Texto: con @IsString o declarado `string` (TypeScript emite el tipo con cualquier decorador).
        const tipo: unknown = Reflect.getMetadata(
          'design:type',
          clase.prototype as object,
          campo,
        );
        if (!nombres.has('isString') && tipo !== String) continue;
        if (![...nombres].some((n) => ACOTAN.has(n)))
          sinLimite.push(`${clase.name}.${campo}`);
      }
    }
    expect(sinLimite).toEqual([]);
  });
});
