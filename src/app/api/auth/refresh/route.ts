import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { Unauthorized } from '@/lib/errors';
import { parseJson, refreshSchema } from '@/lib/validation';
import { limitByIp } from '@/lib/ratelimit';
import { randomToken, sha256 } from '@/lib/password';
import { signAccessToken, REFRESH_TOKEN_DAYS } from '@/lib/jwt';
import { loadUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/refresh
 * Rotates the refresh token: the old one is revoked and a new one
 * issued. If a stolen token is replayed after rotation it fails,
 * which is the point.
 */
export const POST = route(async (req: Request) => {
  limitByIp(req, 'refresh', 30, 15 * 60_000);

  const body = await parseJson(req, refreshSchema);
  const tokenHash = sha256(body.refreshToken);

  const { data: stored, error } = await db
    .from('RefreshToken')
    .select('id, userId, expiresAt, revokedAt')
    .eq('tokenHash', tokenHash)
    .maybeSingle();

  if (error) throw error;
  if (!stored || stored.revokedAt) throw Unauthorized('Session expired. Please log in again.');
  if (new Date(stored.expiresAt) < new Date()) {
    throw Unauthorized('Session expired. Please log in again.');
  }

  const user = await loadUser(stored.userId);
  if (!user || !user.isActive) throw Unauthorized('Session expired. Please log in again.');

  const now = new Date().toISOString();
  await db.from('RefreshToken').update({ revokedAt: now }).eq('id', stored.id);

  const nextToken = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86_400_000);

  const { error: insertError } = await db.from('RefreshToken').insert({
    userId: user.id,
    tokenHash: sha256(nextToken),
    expiresAt: expiresAt.toISOString(),
    userAgent: req.headers.get('user-agent'),
  });
  if (insertError) throw insertError;

  return ok({
    accessToken: await signAccessToken({ sub: user.id, role: user.role }),
    refreshToken: nextToken,
    expiresAt: expiresAt.toISOString(),
  });
});
