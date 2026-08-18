import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/stats — numbers for the admin dashboard. */
export const GET = route(async (req: Request) => {
  await requireStaff(req);

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [products, active, newLeads, inquiries, recentInquiries, recentLeads] = await Promise.all([
    db.from('Product').select('id', { count: 'exact', head: true }),
    db.from('Product').select('id', { count: 'exact', head: true }).eq('isActive', true),
    db.from('Lead').select('id', { count: 'exact', head: true }).eq('status', 'NEW'),
    db.from('Inquiry').select('id', { count: 'exact', head: true }).gte('createdAt', weekAgo),
    db.from('Inquiry').select('productName, variantLabel, price, createdAt')
      .gte('createdAt', weekAgo).order('createdAt', { ascending: false }).limit(200),
    db.from('Lead').select('id, name, phone, productName, status, createdAt')
      .order('createdAt', { ascending: false }).limit(8),
  ]);

  // Most-asked-about phones this week. With no orders, this is the only
  // demand signal the shop has — it is the point of the whole table.
  const tally = new Map<string, number>();
  for (const row of recentInquiries.data ?? []) {
    const key = (row as { productName: string }).productName;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const top = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  return ok({
    products: products.count ?? 0,
    activeProducts: active.count ?? 0,
    newLeads: newLeads.count ?? 0,
    inquiriesThisWeek: inquiries.count ?? 0,
    topProducts: top,
    recentLeads: (recentLeads.data ?? []).map((l) => ({ ...l })),
  });
});
