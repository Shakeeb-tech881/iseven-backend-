import { db } from '@/lib/supabase';
import { created, ok, route } from '@/lib/response';
import { bannerSchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Includes inactive and expired banners, unlike the public route. */
export const GET = route(async (req: Request) => {
  await requireStaff(req);
  const { data, error } = await db
    .from('Banner').select('*').order('sortOrder', { ascending: true });
  if (error) throw error;
  return ok(data ?? []);
});

export const POST = route(async (req: Request) => {
  await requireStaff(req);
  const body = await parseJson(req, bannerSchema);
  const { data, error } = await db.from('Banner').insert(body).select('*').single();
  if (error) throw error;
  return created(data);
});
