import { db } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { NotFound } from '@/lib/errors';
import { bannerSchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const PUT = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const body = await parseJson(req, bannerSchema);

  const { data, error } = await db
    .from('Banner').update(body).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw NotFound('Banner not found');
  return ok(data);
});

/** Banners are decoration — nothing references them, so a hard delete is safe. */
export const DELETE = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const { error } = await db.from('Banner').delete().eq('id', id);
  if (error) throw error;
  return ok({ deleted: true });
});
