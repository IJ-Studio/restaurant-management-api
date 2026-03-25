import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';

export const ActiveUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): ActiveUserData => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as ActiveUserData;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    return user;
  },
);
