import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user, or null.
 *
 * Unlike `getSession()` (which only decodes the cookie locally), `getUser()`
 * revalidates the token against the Supabase Auth server, so a tampered or
 * revoked/expired session is rejected. Wrapped in React's `cache()` so the
 * network check runs at most once per server render pass.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
