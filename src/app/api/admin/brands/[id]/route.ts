import { db, PG } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { Conflict, NotFound } from '@/lib/errors';
import { brandSchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { deleteOrExplain } from '@/lib/crud';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const PUT = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const body = await parseJson(req, brandSchema);

  const { data, error } = await db
    .from('Brand')
    .update({ ...body, slug: body.slug?.trim() || slugify(body.name) })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict('That brand slug is already used');
    throw error;
  }
  if (!data) throw NotFound('Brand not found');
  return ok(data);
});

export const DELETE = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  await deleteOrExplain(
    'Brand',
    id,
    'This brand still has products. Move or delete them first, or switch the brand off instead.',
  );
  return ok({ deleted: true });
});
