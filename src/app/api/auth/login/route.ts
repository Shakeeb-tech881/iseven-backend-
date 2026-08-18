import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { Unauthorized, Forbidden } from '@/lib/errors';
import { loginSchema, parseJson } from '@/lib/validation';
import { limitByIp } from '@/lib/ratelimit';
import { randomToken, sha256, verifyPassword } from '@/lib/password';
import { signAccessToken, REFRESH_TOKEN_DAYS } from '@/lib/jwt';
import { toPublicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/auth/login */
export const POST = route(async (req: Request) => {
  limitByIp(req, 'login', 10, 15 * 60_000);

  const body = await parseJson(req, loginSchema);

  const { data: user, error } = await db
    .from('User')
    .select('id, name, email, phone, role, passwordHash, isActive, phoneVerifiedAt, emailVerifiedAt, createdAt')
    .eq('email', body.email)
    .maybeSingle();

  if (error) throw error;

  // Same message and comparable timing whether the email exists or not,
  // so the endpoint cannot be used to enumerate registered accounts.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const valid = await verifyPassword(body.password, hash);

  if (!user || !valid) throw Unauthorized('Invalid email or password');
  if (!user.isActive) throw Forbidden('This account has been disabled');

  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86_400_000);

  const { error: tokenError } = await db.from('RefreshToken').insert({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: expiresAt.toISOString(),
    userAgent: req.headers.get('user-agent'),
  });
  if (tokenError) throw tokenError;

  return ok({
    user: toPublicUser(user),
    accessToken: await signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    expiresAt: expiresAt.toISOString(),
  });
});
