import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { requireStaff } from '@/lib/auth';
import { queryObject } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Every WhatsApp click. With no orders in the system this is the only
 * record of what customers actually want, so it doubles as the
 * restocking report.
 */
export const GET = route(async (req: Request) => {
  await requireStaff(req);
  const { days = '30' } = queryObject(req.url);
  const since = new Date(Date.now() - Number(days) * 86_400_000).toISOString();

  const { data, error } = await db
    .from('Inquiry')
    .select('id, productId, productName, variantLabel, price, source, createdAt')
    .gte('createdAt', since)
    .order('createdAt', { ascending: false })
    .limit(1000);
  if (error) throw error;

  const rows = (data ?? []).map((r) => ({ ...r, price: Number(r.price) }));

  const byProduct = new Map<string, { name: string; count: number; lastAt: string }>();
  const bySource = new Map<string, number>();
  const byDay = new Map<string, number>();

  for (const r of rows) {
    const p = byProduct.get(r.productName);
    if (p) p.count += 1;
    else byProduct.set(r.productName, { name: r.productName, count: 1, lastAt: r.createdAt });

    bySource.set(r.source ?? 'unknown', (bySource.get(r.source ?? 'unknown') ?? 0) + 1);

    const day = r.createdAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return ok({
    total: rows.length,
    recent: rows.slice(0, 60),
    topProducts: [...byProduct.values()].sort((a, b) => b.count - a.count).slice(0, 15),
    bySource: [...bySource.entries()].map(([source, count]) => ({ source, count })),
    byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({ day, count })),
  });
});
