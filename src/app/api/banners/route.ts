import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { mapBanner } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

/** Only banners that are active and inside their scheduled window. */
export const GET = route(async () => {
  const now = new Date().toISOString();

  const { data, error } = await db
    .from('Banner')
    .select('id, title, subtitle, cta, image, link, startsAt, endsAt')
    .eq('isActive', true)
    .or(`startsAt.is.null,startsAt.lte.${now}`)
    .or(`endsAt.is.null,endsAt.gte.${now}`)
    .order('sortOrder', { ascending: true });

  if (error) throw error;
  return ok((data ?? []).map(mapBanner));
});
