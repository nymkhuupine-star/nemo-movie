import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Accept both the classic and the newer Supabase env var names.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const POSTER_BUCKET = "posters";

export function supabaseStatus() {
  return {
    url: Boolean(url),
    anonKey: Boolean(anonKey),
    serviceKey: Boolean(serviceKey),
  };
}

/** Read-only client (anon key, respects RLS). Null when env is missing. */
export function getPublicClient(): SupabaseClient | null {
  if (!url || !(anonKey || serviceKey)) return null;
  return createClient(url, (anonKey || serviceKey)!, {
    auth: { persistSession: false },
  });
}

/**
 * Server-only client with the service role key; bypasses RLS.
 * Never import this from a Client Component.
 */
export function getAdminClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
