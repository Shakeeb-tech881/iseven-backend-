import { db } from './supabase';
import { verifyAccessToken } from './jwt';
import { Forbidden, Unauthorized } from './errors';
import type { PublicUser, Role } from './types';

export interface Session {
  userId: string;
  role: Role;
}

function bearer(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/** Returns null when there is no valid token. Use for optional auth. */
export async function getSession(req: Request): Promise<Session | null> {
  const token = bearer(req);
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  return { userId: payload.sub, role: payload.role };
}

/** Throws 401 when not logged in. */
export async function requireAuth(req: Request): Promise<Session> {
  const session = await getSession(req);
  if (!session) throw Unauthorized();
  return session;
}

/** Throws 401/403 unless the caller is STAFF or ADMIN. */
export async function requireStaff(req: Request): Promise<Session> {
  const session = await requireAuth(req);
  if (session.role !== 'STAFF' && session.role !== 'ADMIN') throw Forbidden();
  return session;
}

export async function requireAdmin(req: Request): Promise<Session> {
  const session = await requireAuth(req);
  if (session.role !== 'ADMIN') throw Forbidden('Admin access required');
  return session;
}

/** Shape returned to the client. Never includes passwordHash. */
export function toPublicUser(row: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  phoneVerifiedAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
}): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    phoneVerified: row.phoneVerifiedAt !== null,
    emailVerified: row.emailVerifiedAt !== null,
    createdAt: row.createdAt,
  };
}

export async function loadUser(userId: string) {
  const { data, error } = await db
    .from('User')
    .select('id, name, email, phone, role, phoneVerifiedAt, emailVerifiedAt, createdAt, isActive')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
