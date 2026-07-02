import {
  Injectable,
  CanActivate,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { shouldBlockRequest } from '@aikidosec/firewall';

@Injectable()
export class ZenGuard implements CanActivate {
  async canActivate(): Promise<boolean> {
    try {
      // Creamos una promesa de escape (Timeout) de 1.5 segundos
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Zen Firewall Timeout')), 1500),
      );

      // Ejecutamos la función (sin argumentos como pide la librería)
      // compitiendo contra nuestro temporizador de escape
      const result = await Promise.race([
        Promise.resolve(shouldBlockRequest()),
        timeoutPromise
      ]);

      // Si el firewall indica que debe bloquear, ejecutamos la excepción
      if (result && result.block) {
        if (result.type === 'ratelimited') {
          throw new HttpException(
            'You are rate limited by Zen.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        if (result.type === 'blocked') {
          throw new HttpException(
            'You are blocked by Zen.',
            HttpStatus.FORBIDDEN,
          );
        }
      }
    } catch (error: any) {
      // Si la librería de Aikido falla, se cae o tarda demasiado,
      // imprimimos el error en consola pero dejamos pasar la petición (fail-open)
      // para que tu servidor de reservas NO se quede congelado.
      console.error('⚠️ [ZenGuard Warning]:', error.message || error);
    }

    return true;
  }
}
