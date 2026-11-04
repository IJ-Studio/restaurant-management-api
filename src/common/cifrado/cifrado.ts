import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { customType } from 'drizzle-orm/pg-core';

/**
 * Cifrado de campos sensibles (teléfono, dirección, RFC, datos fiscales y laborales).
 *
 * - AES-256-GCM. Formato guardado: `enc:v<versión>:<iv>.<etiqueta>.<texto cifrado>` (base64url).
 * - Claves en `CIFRADO_CLAVES` = "1:<32 bytes en base64>,2:<…>"; se cifra con `CIFRADO_VERSION`
 *   y se descifra con la versión que trae cada valor (rotación sin migrar todo de golpe).
 * - Escritura cifrada solo con `CIFRADO_ESCRIBIR=true`: el API desplegado todavía no descifra, así
 *   que hasta activarlo los valores se siguen guardando en claro. La lectura acepta ambos.
 * - Índice ciego (HMAC-SHA256 con `CIFRADO_HMAC_CLAVE`) para buscar o exigir unicidad.
 * - Las contraseñas NO pasan por aquí: se guardan con bcrypt (hash, no reversible).
 */
const PREFIJO = /^enc:v(\d+):([\w-]+)\.([\w-]+)\.([\w-]*)$/;

function claves(): Map<number, Buffer> {
  const mapa = new Map<number, Buffer>();
  for (const par of (process.env.CIFRADO_CLAVES ?? '').split(',')) {
    const [version, clave] = par.split(':');
    if (!version || !clave) continue;
    const buffer = Buffer.from(clave, 'base64');
    if (buffer.length !== 32)
      throw new Error(`La clave de cifrado v${version} no mide 32 bytes.`);
    mapa.set(Number(version), buffer);
  }
  return mapa;
}

const escrituraActiva = () => process.env.CIFRADO_ESCRIBIR === 'true';

export function estaCifrado(valor: unknown): boolean {
  return typeof valor === 'string' && PREFIJO.test(valor);
}

export function cifrar(texto: string, forzar = false): string {
  if ((!escrituraActiva() && !forzar) || estaCifrado(texto)) return texto;
  const version = Number(process.env.CIFRADO_VERSION ?? 1);
  const clave = claves().get(version);
  if (!clave) throw new Error(`Falta la clave de cifrado v${version}.`);
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', clave, iv);
  const datos = Buffer.concat([
    cifrador.update(texto, 'utf8'),
    cifrador.final(),
  ]);
  const etiqueta = cifrador.getAuthTag();
  return `enc:v${version}:${iv.toString('base64url')}.${etiqueta.toString('base64url')}.${datos.toString('base64url')}`;
}

/** Valor en claro tal cual; valor cifrado → texto. Un valor manipulado lanza error (GCM). */
export function descifrar(valor: string): string {
  const m = PREFIJO.exec(valor);
  if (!m) return valor;
  const clave = claves().get(Number(m[1]));
  if (!clave) throw new Error(`Falta la clave de cifrado v${m[1]}.`);
  const descifrador = createDecipheriv(
    'aes-256-gcm',
    clave,
    Buffer.from(m[2], 'base64url'),
  );
  descifrador.setAuthTag(Buffer.from(m[3], 'base64url'));
  return Buffer.concat([
    descifrador.update(Buffer.from(m[4], 'base64url')),
    descifrador.final(),
  ]).toString('utf8');
}

/** Índice ciego: mismo valor normalizado → mismo HMAC; sirve para UNIQUE y búsquedas exactas. */
export function indiceCiego(valor: string): string {
  const clave = process.env.CIFRADO_HMAC_CLAVE;
  if (!clave) throw new Error('Falta CIFRADO_HMAC_CLAVE.');
  return createHmac('sha256', Buffer.from(clave, 'base64'))
    .update(valor.trim().toUpperCase())
    .digest('base64url');
}

/** Columna de texto que Drizzle cifra al escribir y descifra al leer. */
export const textoCifrado = customType<{ data: string; driverData: string }>({
  dataType: () => 'text',
  toDriver: (valor) => cifrar(valor),
  fromDriver: (valor) => descifrar(valor),
});
