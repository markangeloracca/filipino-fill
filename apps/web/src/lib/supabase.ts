import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { env } from "./env"

let client: SupabaseClient | null = null

/** Browser-only Supabase client, used for email OTP auth. Data access goes through the API. */
export function getSupabase(): SupabaseClient {
  client ??= createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  return client
}
