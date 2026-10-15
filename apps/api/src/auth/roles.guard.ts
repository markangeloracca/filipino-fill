import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenActionException, UnauthenticatedException } from '../common/errors/domain.exceptions.js';
import type { UserRole } from '../database/database.types.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { ROLES_KEY } from './decorators.js';

/** Must run after AuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthenticatedException('Sign in to continue');
    if (!required.includes(user.role)) throw new ForbiddenActionException('You do not have permission to do that');
    return true;
  }
}
