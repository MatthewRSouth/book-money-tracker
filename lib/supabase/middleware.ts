import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Inactivity timeout: the auth cookie is re-issued on every request (Supabase
// refreshes the session here), so capping its max-age means an idle session
// expires this long after the user's *last* request, forcing re-login. Active
// users keep renewing it and stay signed in. Change this one value to tune it.
const INACTIVITY_TIMEOUT_SECONDS = 2 * 60 * 60; // 2 hours

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => {
            // Only shorten real session cookies. Deletions (empty value) keep
            // their original options so sign-out still clears the cookie.
            const capped = value
              ? {
                  ...options,
                  maxAge: Math.min(
                    options?.maxAge ?? INACTIVITY_TIMEOUT_SECONDS,
                    INACTIVITY_TIMEOUT_SECONDS
                  ),
                }
              : options;
            response.cookies.set(name, value, capped);
          });
        },
      },
    }
  );

  return { supabase, response };
}
