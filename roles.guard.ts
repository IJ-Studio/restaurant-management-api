// import { Injectable, ExecutionContext } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Roles } from './roles.decorator';
// import { matchRoles } from './match-roles';

// @Injectable()
// export class RolesGuard {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const roles = this.reflector.get(Roles, context.getHandler());
//     if (!roles) {
//       return true;
//     }
//     const request = context.switchToHttp().getRequest();
//     const user = request.user;
//     return matchRoles(roles, user.roles);
//   }
// }
