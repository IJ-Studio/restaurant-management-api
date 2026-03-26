import {
  Injectable,
  CanActivate,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { shouldBlockRequest } from '@aikidosec/firewall';

@Injectable()
export class ZenGuard implements CanActivate {
  canActivate(): boolean {
    const result = shouldBlockRequest();
    if (result.block) {
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
    return true;
  }
}
