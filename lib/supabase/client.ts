// lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export type SupabaseClient = ReturnType<typeof createBrowserClient>;

let warnedMissingEnv = false;

function warnMissingEnv() {
  if (warnedMissingEnv || process.env.NODE_ENV === "production") {
    return;
  }
  warnedMissingEnv = true;
  console.warn(
    "Supabase environment variables are not configured. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable authentication features.",
  );
}

const fallbackClient: SupabaseClient = {
  auth: {
    async getUser() {
      return { data: { user: null }, error: null } as ReturnType<
        SupabaseClient["auth"]["getUser"]
      >;
    },
    async signInWithOAuth() {
      const err = new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured.");
      console.error(err);
      return { data: { provider: "google" as any, url: null }, error: err } as any;
    },
    async signInWithPassword() {
      const err = new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured.");
      return { data: { user: null, session: null }, error: err } as any;
    },
    onAuthStateChange() {
      return {
        data: {
          subscription: {
            unsubscribe() {
              // noop
            },
          },
        },
        error: null,
      } as ReturnType<SupabaseClient["auth"]["onAuthStateChange"]>;
    },
    async signOut() {
      return { error: null } as Awaited<ReturnType<SupabaseClient["auth"]["signOut"]>>;
    },
  },
} as SupabaseClient;

/** Browser-only Supabase client (safe in "use client" files). */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    warnMissingEnv();
    return fallbackClient;
  }

  return createBrowserClient(url, anonKey);
}

export default createClient;
