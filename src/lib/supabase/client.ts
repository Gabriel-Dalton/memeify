import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

// Lightweight "user identity" for a casual party game — just a random UUID
// kept in localStorage. No Supabase auth, no email, no sign-in. Good enough
// for tracking who submitted which meme and who cast which vote.
const USER_ID_KEY = "memeify-user-id";

function randomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback — very old browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getLocalUserId(): string {
  if (typeof window === "undefined") {
    // Server-side — return a throwaway ID; actual game flows run client-side.
    return randomUuid();
  }
  let id = window.localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = randomUuid();
    window.localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

// Backwards-compatible shim — existing callers expect a user object with an id.
export async function ensureAuthenticatedUser() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const id = getLocalUserId();
  return { id } as { id: string };
}
