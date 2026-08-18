import { db, PG } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { Conflict, NotFound } from '@/lib/errors';
import { categorySchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { deleteOrExplain } from '@/lib/crud';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const PUT = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const body = await parseJson(req, categorySchema);

  const { data, error } = await db
    .from('Category')
    .update({ ...body, slug: body.slug?.trim() || slugify(body.name) })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict('That category slug is already used');
    throw error;
  }
  if (!data) throw NotFound('Category not found');
  return ok(data);
});

export const DELETE = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  await deleteOrExplain(
    'Category',
    id,
    'This category still has products. Move or delete them first, or switch it off instead.',
  );
  return ok({ deleted: true });
});
