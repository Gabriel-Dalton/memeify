import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export async function ensureAuthenticatedUser() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const existing = await supabase.auth.getUser();
  if (existing.data.user) {
    return existing.data.user;
  }

  const anonymous = await supabase.auth.signInAnonymously();
  if (anonymous.error || !anonymous.data.user) {
    throw new Error(anonymous.error?.message ?? "Unable to sign in anonymously.");
  }

  return anonymous.data.user;
}
