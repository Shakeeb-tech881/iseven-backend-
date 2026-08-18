import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';
import type { Role } from './types';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_DAYS = 30;

export interface AccessTokenPayload {
  sub: string;   // user id
  role: Role;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, role: (payload.role as Role) ?? 'CUSTOMER' };
  } catch {
    return null;
  }
}
