import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { parseJson, refreshSchema } from '@/lib/validation';
import { sha256 } from '@/lib/password';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — revokes the refresh token. */
export const POST = route(async (req: Request) => {
  const body = await parseJson(req, refreshSchema);

  await db
    .from('RefreshToken')
    .update({ revokedAt: new Date().toISOString() })
    .eq('tokenHash', sha256(body.refreshToken))
    .is('revokedAt', null);

  // Always succeeds. A token that was already revoked is still logged out.
  return ok({ success: true });
});
