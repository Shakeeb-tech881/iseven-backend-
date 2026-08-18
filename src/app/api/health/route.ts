import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';

export const dynamic = 'force-dynamic';

/** Ping this from a cron job every few days so the free Supabase project never pauses. */
export const GET = route(async () => {
  const started = Date.now();
  const { error } = await db.from('Brand').select('id').limit(1);

  return ok({
    status: error ? 'degraded' : 'ok',
    database: error ? error.message : 'connected',
    latencyMs: Date.now() - started,
    time: new Date().toISOString(),
  });
});
