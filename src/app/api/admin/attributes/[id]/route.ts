import { db, PG } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { Conflict, NotFound } from '@/lib/errors';
import { attributeSchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Values sent with an id are updated; missing ones are removed. */
export const PUT = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const body = await parseJson(req, attributeSchema);

  const { data, error } = await db
    .from('Attribute')
    .update({
      name: body.name,
      slug: body.slug?.trim() || slugify(body.name),
      kind: body.kind,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict('That slug is already used');
    throw error;
  }
  if (!data) throw NotFound('Attribute not found');

  const keep = body.values.map((v) => v.id).filter(Boolean) as string[];
  if (keep.length) {
    await db.from('AttributeValue').delete()
      .eq('attributeId', id).not('id', 'in', `(${keep.join(',')})`);
  } else {
    await db.from('AttributeValue').delete().eq('attributeId', id);
  }

  for (const [i, v] of body.values.entries()) {
    const row = {
      attributeId: id,
      label: v.label,
      hex: v.hex ?? null,
      sortOrder: v.sortOrder || i,
    };
    const { error: e } = v.id
      ? await db.from('AttributeValue').update(row).eq('id', v.id)
      : await db.from('AttributeValue').insert(row);
    if (e) {
      if (e.code === PG.UNIQUE_VIOLATION) throw Conflict(`"${v.label}" is listed twice`);
      throw e;
    }
  }

  return ok({ id });
});

export const DELETE = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  // Values cascade. Products keep the text already saved on their
  // variants, so removing a list never rewrites existing stock.
  const { error } = await db.from('Attribute').delete().eq('id', id);
  if (error) throw error;
  return ok({ deleted: true });
});
