/**
 * `globalSetup` de `pnpm test:integracion`: inicia sesión una vez por rol antes de todas las suites y
 * deja los tokens en variables de entorno del proceso, que heredan las suites. Así no se pasa del
 * límite de 5 logins por minuto. Si el API local no responde, no hace nada y las suites se saltan.
 */
import { apiLocal, entrar, http, type Rol, variableToken } from './apoyo';

const ROLES: Rol[] = ['admin', 'cajero', 'mesero', 'cocina', 'cliente'];

export default async function sesiones(): Promise<void> {
  if (!apiLocal) return;
  try {
    if ((await http('GET', '/reglas')).status !== 200) return;
  } catch {
    return;
  }
  for (const rol of ROLES)
    process.env[variableToken(rol)] ??= await entrar(rol);
}
