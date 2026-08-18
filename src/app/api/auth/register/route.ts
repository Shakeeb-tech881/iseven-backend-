import { db, PG } from '@/lib/supabase';
import { created, route } from '@/lib/response';
import { Conflict } from '@/lib/errors';
import { parseJson, registerSchema } from '@/lib/validation';
import { limitByIp } from '@/lib/ratelimit';
import { hashPassword, randomToken, sha256 } from '@/lib/password';
import { signAccessToken, REFRESH_TOKEN_DAYS } from '@/lib/jwt';
import { toPublicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/auth/register */
export const POST = route(async (req: Request) => {
  limitByIp(req, 'register', 5, 15 * 60_000);

  const body = await parseJson(req, registerSchema);
  const now = new Date().toISOString();

  const { data: user, error } = await db
    .from('User')
    .insert({
      name: body.name,
      email: body.email,
      phone: body.phone.raw,
      phoneE164: body.phone.e164,
      passwordHash: await hashPassword(body.password),
      // role is NEVER taken from the request body. Admins are promoted
      // manually in the database.
      role: 'CUSTOMER',
      marketingConsentAt: body.marketingConsent ? now : null,
    })
    .select('id, name, email, phone, role, phoneVerifiedAt, emailVerifiedAt, createdAt')
    .single();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) {
      throw Conflict('An account with that email or phone number already exists');
    }
    throw error;
  }

  // Claim any inquiries this person made as a guest, matched on the
  // canonical phone number.
  const { error: backfillError } = await db
    .from('Lead')
    .update({ userId: user.id, updatedAt: now })
    .is('userId', null)
    .eq('phoneE164', body.phone.e164);

  if (backfillError) console.error('[register] lead backfill failed', backfillError);

  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86_400_000);

  const { error: tokenError } = await db.from('RefreshToken').insert({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: expiresAt.toISOString(),
    userAgent: req.headers.get('user-agent'),
  });
  if (tokenError) throw tokenError;

  return created({
    user: toPublicUser(user),
    accessToken: await signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    expiresAt: expiresAt.toISOString(),
  });
});
