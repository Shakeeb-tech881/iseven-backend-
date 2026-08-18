import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { BadRequest } from '@/lib/errors';
import { heroSchema, navSchema, shopSchema } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/settings?key=hero */
export const GET = route(async (req: Request) => {
  await requireStaff(req);
  const key = new URL(req.url).searchParams.get('key') ?? 'hero';

  const { data, error } = await db
    .from('Setting').select('key, value').eq('key', key).maybeSingle();
  if (error) throw error;

  return ok(data?.value ?? null);
});

/**
 * PUT /api/admin/settings?key=hero
 * Each key has its own schema, so a typo in the hero form cannot write
 * arbitrary JSON into the site configuration.
 */
export const PUT = route(async (req: Request) => {
  await requireStaff(req);
  const key = new URL(req.url).searchParams.get('key') ?? 'hero';

  // Each key has its own schema, so a typo in one form cannot write
  // arbitrary JSON into another part of the site configuration.
  const schemas = { hero: heroSchema, shop: shopSchema, nav: navSchema } as const;
  const schema = schemas[key as keyof typeof schemas];
  if (!schema) throw BadRequest(`Unknown setting "${key}"`);

  const raw = await req.json().catch(() => null);
  const value = schema.parse(raw);

  const { error } = await db
    .from('Setting')
    .upsert({ key, value, updatedAt: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;

  return ok(value);
});
