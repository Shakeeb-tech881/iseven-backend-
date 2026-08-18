import { db } from '@/lib/supabase';
import { paginated, route } from '@/lib/response';
import { queryObject } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/leads?status=NEW&search=0771234567&page=1&limit=20
 * The leads inbox. This is your follow-up queue.
 */
export const GET = route(async (req: Request) => {
  await requireStaff(req);

  const { status, search, page = '1', limit = '20' } = queryObject(req.url);
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));

  let query = db
    .from('Lead')
    .select(`
      id, userId, name, phone, phoneE164, email, city,
      productId, productName, variantLabel, price, message,
      status, notes, createdAt, updatedAt
    `, { count: 'exact' })
    .order('createdAt', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) {
    const term = search.replace(/[%,()]/g, ' ').trim();
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,phoneE164.ilike.%${term}%,productName.ilike.%${term}%`,
    );
  }

  const from = (p - 1) * l;
  const { data, error, count } = await query.range(from, from + l - 1);
  if (error) throw error;

  const leads = (data ?? []).map((l2) => ({ ...l2, price: Number(l2.price) }));
  return paginated(leads, p, l, count ?? 0);
});
