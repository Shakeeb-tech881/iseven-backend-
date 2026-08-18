import { db, PG } from '@/lib/supabase';
import { created, ok, route } from '@/lib/response';
import { Conflict } from '@/lib/errors';
import { categorySchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireStaff(req);
  const { data, error } = await db
    .from('Category')
    .select('*')
    .order('sortOrder', { ascending: true });
  if (error) throw error;
  return ok(data ?? []);
});

export const POST = route(async (req: Request) => {
  await requireStaff(req);
  const body = await parseJson(req, categorySchema);

  const { data, error } = await db
    .from('Category')
    .insert({ ...body, slug: body.slug?.trim() || slugify(body.name) })
    .select('*')
    .single();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict('That category slug already exists');
    throw error;
  }
  return created(data);
});
