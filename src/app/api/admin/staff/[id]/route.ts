import { db } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { BadRequest, NotFound } from '@/lib/errors';
import { parseJson, staffUpdateSchema } from '@/lib/validation';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Change a staff member's role, or switch their access off. */
export const PATCH = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  const session = await requireAdmin(req);
  const { id } = await ctx.params;
  const body = await parseJson(req, staffUpdateSchema);

  // Locking yourself out of your own admin panel is unrecoverable
  // without database access, so it is simply not allowed.
  if (id === session.userId) {
    if (body.role && body.role !== 'ADMIN') {
      throw BadRequest('You cannot remove your own admin access.');
    }
    if (body.isActive === false) {
      throw BadRequest('You cannot deactivate your own account.');
    }
  }

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.role !== undefined) patch.role = body.role;
  if (body.isActive !== undefined) patch.isActive = body.isActive;

  const { data, error } = await db
    .from('User').update(patch).eq('id', id)
    .select('id, name, email, role, isActive').maybeSingle();
  if (error) throw error;
  if (!data) throw NotFound('User not found');

  // Dropping someone's access should log them out everywhere, not wait
  // for their tokens to expire on their own.
  if (body.isActive === false || (body.role && body.role === 'CUSTOMER')) {
    await db.from('RefreshToken')
      .update({ revokedAt: new Date().toISOString() })
      .eq('userId', id).is('revokedAt', null);
  }

  return ok(data);
});
