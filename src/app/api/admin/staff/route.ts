import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * ADMIN only, not STAFF — otherwise a shop assistant could promote
 * themselves. Never returns passwordHash.
 */
export const GET = route(async (req: Request) => {
  await requireAdmin(req);

  const { data, error } = await db
    .from('User')
    .select('id, name, email, phone, role, isActive, createdAt, phoneVerifiedAt, emailVerifiedAt')
    .in('role', ['STAFF', 'ADMIN'])
    .order('createdAt', { ascending: true });
  if (error) throw error;

  return ok(data ?? []);
});
