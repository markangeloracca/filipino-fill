import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { TokenVerifier, type VerifiedIdentity } from './token-verifier.js';

/**
 * Validates access tokens against Supabase Auth. Asking GoTrue (rather than only
 * checking the JWT signature) means revoked sessions are rejected immediately.
 */
@Injectable()
export class SupabaseTokenVerifier extends TokenVerifier {
  private readonly logger = new Logger(SupabaseTokenVerifier.name);
  private readonly client: SupabaseClient;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.client = createClient(config.get('SUPABASE_URL', { infer: true }), config.get('SUPABASE_PUBLISHABLE_KEY', { infer: true }), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  async verify(accessToken: string): Promise<VerifiedIdentity | null> {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error || !data.user?.email) {
      if (error && error.status !== 401 && error.status !== 403) {
        this.logger.warn(`Token verification failed: ${error.message}`);
      }
      return null;
    }
    return { userId: data.user.id, email: data.user.email };
  }
}
