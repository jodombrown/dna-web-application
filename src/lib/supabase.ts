// One Supabase client for the browser. The canonical DNA project (dgspjevjoblujcoljvkn) is the
// default so preview deployments work without configuring env; VITE_* overrides win when set.
// Publishable keys are public by design; RLS is the boundary.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { captureRecoveryFromUrl } from "./recovery";

export const SUPABASE_URL =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
  "https://dgspjevjoblujcoljvkn.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
  "sb_publishable_yuc09jnHUXWQfMbbAp5_ng_2zXPNU0x";

export type Supabase = SupabaseClient<Database>;

let client: Supabase | null = null;

/** Browser-only singleton. Returns null during SSR; callers run inside effects. */
export function getSupabase(): Supabase | null {
  if (typeof window === "undefined") return null;
  if (!client) {
    // Ruling 240: detectSessionInUrl consumes the recovery fragment and strips it, so the fragment
    // is read and recorded before the client exists. Without this the app cannot tell a recovery
    // sign-in from any other one, which is exactly how the token reached the Feed.
    captureRecoveryFromUrl();
    client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export function functionsUrl(name: string): string {
  return SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/" + name;
}
