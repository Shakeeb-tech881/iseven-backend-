import { db, PG } from '@/lib/supabase';
import { created, ok, route } from '@/lib/response';
import { Conflict } from '@/lib/errors';
import { attributeSchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * The option lists staff pick from when adding a product — storage
 * sizes, RAM, colours. Defining them once stops "256GB" and "256 GB"
 * becoming two different filter values.
 */
export const GET = route(async (req: Request) => {
  await requireStaff(req);

  const { data, error } = await db
    .from('Attribute')
    .select(`id, name, slug, kind, sortOrder, isActive,
             values:AttributeValue ( id, label, hex, sortOrder )`)
    .order('sortOrder', { ascending: true });
  if (error) throw error;

  return ok(
    (data ?? []).map((a) => ({
      ...a,
      values: [...((a.values as { sortOrder: number }[]) ?? [])].sort(
        (x, y) => x.sortOrder - y.sortOrder,
      ),
    })),
  );
});

export const POST = route(async (req: Request) => {
  await requireStaff(req);
  const body = await parseJson(req, attributeSchema);

  const { data: attr, error } = await db
    .from('Attribute')
    .insert({
      name: body.name,
      slug: body.slug?.trim() || slugify(body.name),
      kind: body.kind,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict('That attribute already exists');
    throw error;
  }

  if (body.values.length) {
    const { error: valueError } = await db.from('AttributeValue').insert(
      body.values.map((v, i) => ({
        attributeId: attr.id,
        label: v.label,
        hex: v.hex ?? null,
        sortOrder: v.sortOrder || i,
      })),
    );
    if (valueError) {
      await db.from('Attribute').delete().eq('id', attr.id);
      throw valueError;
    }
  }

  return created({ id: attr.id });
});
