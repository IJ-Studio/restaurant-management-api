import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUEST_USER_KEY } from 'src/common/constants';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<number[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const request = context.switchToHttp().getRequest<{
      [REQUEST_USER_KEY]?: ActiveUserData;
    }>();
    const user = request[REQUEST_USER_KEY];
    if (!user) return false;
    return requiredRoles.some((role) => user.roleId === role);
  }
}
