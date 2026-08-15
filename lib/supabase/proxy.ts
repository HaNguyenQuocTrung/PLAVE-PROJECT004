import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthNavigationDecision } from "@/lib/auth/navigation";
import {
  AUTH_REQUEST_STATE_HEADER,
  createAuthFailureCircuit,
  inspectSupabaseAuthCookie,
  type AuthRequestState,
} from "@/lib/auth/session-boundary";
import {
  createSupabaseFailSafeFetch,
  SUPABASE_PROXY_AUTH_TIMEOUT_MS,
} from "@/lib/supabase/auth-fetch";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const authFailureCircuit = createAuthFailureCircuit();

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_REQUEST_STATE_HEADER);
  const createPassThroughResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  let response = createPassThroughResponse();
  let userPresent = false;
  let authCheckSucceeded = false;
  let authCookieNames: readonly string[] = [];

  const setRequestState = (state: AuthRequestState) => {
    requestHeaders.set(AUTH_REQUEST_STATE_HEADER, state);
    response = createPassThroughResponse();
  };

  const clearAuthCookies = () => {
    for (const name of authCookieNames) {
      request.cookies.delete(name);
      response.cookies.set(name, "", {
        path: "/",
        sameSite: "lax",
        maxAge: 0,
      });
    }
  };

  const copyCookies = (target: NextResponse) => {
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
    return target;
  };

  const loginRedirect = (reason?: "auth-unavailable" | "session-invalid") => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    if (reason) loginUrl.searchParams.set("error", reason);
    return copyCookies(NextResponse.redirect(loginUrl));
  };

  const anonymousDecision = (
    state: Extract<AuthRequestState, "ANONYMOUS" | "RECOVERED">,
  ) => {
    setRequestState(state);
    if (state === "RECOVERED") clearAuthCookies();
    return getAuthNavigationDecision(request.nextUrl.pathname, false) === "LOGIN"
      ? loginRedirect(state === "RECOVERED" ? "session-invalid" : undefined)
      : response;
  };

  try {
    const { url, publishableKey } = getSupabasePublicEnv();
    const authCookie = inspectSupabaseAuthCookie(request.cookies.getAll(), url);
    authCookieNames = authCookie.names;
    if (authCookie.kind === "ABSENT") return anonymousDecision("ANONYMOUS");
    if (authCookie.kind === "MALFORMED") return anonymousDecision("RECOVERED");

    if (authFailureCircuit.isOpen()) {
      setRequestState("UNAVAILABLE");
      return getAuthNavigationDecision(request.nextUrl.pathname, false) === "LOGIN"
        ? loginRedirect("auth-unavailable")
        : response;
    }

    const authFetch = createSupabaseFailSafeFetch({
      authTimeoutMs: SUPABASE_PROXY_AUTH_TIMEOUT_MS,
    });
    const supabase = createServerClient(url, publishableKey, {
      global: { fetch: authFetch.fetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          if (authFetch.didTransientAuthFailure()) return;
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = createPassThroughResponse();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (authFetch.didTransientAuthFailure()) {
      authFailureCircuit.markUnavailable();
      setRequestState("UNAVAILABLE");
      return getAuthNavigationDecision(request.nextUrl.pathname, false) === "LOGIN"
        ? loginRedirect("auth-unavailable")
        : response;
    }
    authFailureCircuit.markAvailable();
    authCheckSucceeded = !error;
    userPresent = Boolean(user);
  } catch {
    authFailureCircuit.markUnavailable();
    setRequestState("UNAVAILABLE");
    return getAuthNavigationDecision(request.nextUrl.pathname, false) === "LOGIN"
      ? loginRedirect("auth-unavailable")
      : response;
  }

  if (!authCheckSucceeded) {
    return anonymousDecision("RECOVERED");
  }

  const decision = getAuthNavigationDecision(
    request.nextUrl.pathname,
    userPresent,
  );

  if (decision === "LOGIN") {
    return loginRedirect();
  }

  if (decision === "DASHBOARD") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return copyCookies(NextResponse.redirect(dashboardUrl));
  }

  return response;
}
