export interface VerifiedIdentity {
  userId: string;
  email: string;
}

/**
 * Port for validating bearer tokens. The Supabase adapter is bound by default;
 * swap it (e.g. for local JWKS verification or a test double) without touching guards.
 */
export abstract class TokenVerifier {
  abstract verify(accessToken: string): Promise<VerifiedIdentity | null>;
}
