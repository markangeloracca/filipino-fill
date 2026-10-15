import { Global, Module } from '@nestjs/common';
import { ProfilesRepository } from '../profiles/profiles.repository.js';
import { AuthGuard } from './auth.guard.js';
import { MeController } from './me.controller.js';
import { RolesGuard } from './roles.guard.js';
import { SupabaseTokenVerifier } from './supabase-token-verifier.js';
import { TokenVerifier } from './token-verifier.js';

@Global()
@Module({
  controllers: [MeController],
  providers: [{ provide: TokenVerifier, useClass: SupabaseTokenVerifier }, ProfilesRepository, AuthGuard, RolesGuard],
  exports: [TokenVerifier, ProfilesRepository, AuthGuard, RolesGuard],
})
export class AuthModule {}
