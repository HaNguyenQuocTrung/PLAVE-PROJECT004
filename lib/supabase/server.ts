import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

export const SUPABASE_SERVER_REQUEST_TIMEOUT_MS = 8_000;

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const existingSignal = init?.signal;
  const abortFromExistingSignal = () => controller.abort();
  if (existingSignal?.aborted) controller.abort();
  else {
    existingSignal?.addEventListener("abort", abortFromExistingSignal, {
      once: true,
    });
  }
  const timeout = setTimeout(
    () => controller.abort(),
    SUPABASE_SERVER_REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    existingSignal?.removeEventListener("abort", abortFromExistingSignal);
  }
};

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
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
