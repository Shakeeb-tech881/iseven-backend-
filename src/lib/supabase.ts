import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * SERVER ONLY. Uses the service_role key, which bypasses Row Level
 * Security entirely. Never import this into a client component, and
 * never expose the key to the browser.
 */
export const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Postgres error codes worth handling by name. */
export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_FOUND: 'PGRST116',
} as const;
