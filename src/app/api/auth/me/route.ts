import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { Unauthorized } from '@/lib/errors';
import { loadUser, requireAuth, toPublicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 * Profile plus the phones this person has inquired about — including
 * the ones they asked about as a guest before registering.
 */
export const GET = route(async (req: Request) => {
  const session = await requireAuth(req);

  const user = await loadUser(session.userId);
  if (!user || !user.isActive) throw Unauthorized();

  const { data: leads, error } = await db
    .from('Lead')
    .select('id, productId, productName, variantLabel, price, status, createdAt')
    .eq('userId', session.userId)
    .order('createdAt', { ascending: false })
    .limit(20);

  if (error) throw error;

  return ok({
    user: toPublicUser(user),
    inquiries: (leads ?? []).map((l) => ({ ...l, price: Number(l.price) })),
  });
});
