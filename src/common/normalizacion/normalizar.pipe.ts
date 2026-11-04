import {
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

const NATIVOS = new Set<unknown>([Object, Array, String, Number, Boolean]);

/**
 * Pipe global: convierte el cuerpo en su DTO para que actúen los decoradores de normalización
 * (`Texto`, `TextoNegocio`, `Correo`). No valida ni quita campos: los clientes que mandan campos
 * de más siguen funcionando igual. La validación sigue en los pipes de cada ruta.
 */
@Injectable()
export class NormalizarPipe implements PipeTransform {
  transform(value: unknown, { type, metatype }: ArgumentMetadata) {
    if (type !== 'body' || !metatype || NATIVOS.has(metatype)) return value;
    if (value === null || typeof value !== 'object') return value;
    return plainToInstance(metatype, value) as unknown;
  }
}
