import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  createSupabaseFailSafeFetch,
  SUPABASE_SERVER_AUTH_TIMEOUT_MS,
  SUPABASE_SERVER_REQUEST_TIMEOUT_MS,
} from "@/lib/supabase/auth-fetch";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();
  const failSafeFetch = createSupabaseFailSafeFetch({
    authTimeoutMs: SUPABASE_SERVER_AUTH_TIMEOUT_MS,
    requestTimeoutMs: SUPABASE_SERVER_REQUEST_TIMEOUT_MS,
  });

  return createServerClient(url, publishableKey, {
    global: { fetch: failSafeFetch.fetch },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (failSafeFetch.didTransientAuthFailure()) return;
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The root proxy refreshes them.
        }
      },
    },
  });
}
