import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmailNotVerifiedException, UnauthenticatedException } from '../common/errors/domain.exceptions.js';
import { ProfilesRepository } from '../profiles/profiles.repository.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { ALLOW_UNVERIFIED } from './decorators.js';
import { TokenVerifier } from './token-verifier.js';

const BEARER = /^Bearer\s+(\S+)$/i;

/** Requires a valid Supabase session and (by default) a verified email. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly verifier: TokenVerifier,
    private readonly profiles: ProfilesRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    if (!token) throw new UnauthenticatedException('Sign in to continue');

    const identity = await this.verifier.verify(token);
    if (!identity) throw new UnauthenticatedException('Your session has expired. Please sign in again');

    const profile = await this.profiles.findById(identity.userId);
    if (!profile) throw new UnauthenticatedException('Account not found');

    req.user = {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      role: profile.role,
      emailVerified: profile.email_verified_at !== null,
    };

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED, [context.getHandler(), context.getClass()]);
    if (!req.user.emailVerified && !allowUnverified) throw new EmailNotVerifiedException();

    return true;
  }
}
