import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '../database/database.types.js';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types.js';

export const ROLES_KEY = 'roles';
export const ALLOW_UNVERIFIED = 'allowUnverified';

/** Restrict a route to the given roles. Use together with AuthGuard + RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Let a signed-in but unverified user through AuthGuard (e.g. to read their own profile). */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error('CurrentUser used on a route without AuthGuard');
  return user;
});
