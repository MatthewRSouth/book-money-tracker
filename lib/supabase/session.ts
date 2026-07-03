import { cache } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Reads the current auth session once per render pass.
 *
 * `getSession()` decodes the session from the cookie locally (no network round
 * trip), but wrapping it in React's `cache()` dedupes repeated calls within a
 * single server render so pages that check auth alongside other data don't
 * re-run the work. Security enforcement lives in `proxy.ts` (middleware).
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});
