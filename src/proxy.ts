import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS (Next 16 "proxy" convention, formerly middleware).
 *
 * CORS for the Lovable / TanStack frontend, which runs on a different
 * origin to this API. Without this the browser blocks every request
 * with "No 'Access-Control-Allow-Origin' header".
 *
 * Set ALLOWED_ORIGINS in .env.local as a comma-separated list:
 *   ALLOWED_ORIGINS=http://localhost:5173,https://isevenlk.lovable.app,https://iseven.lk
 *
 * Do NOT use "*" — credentials cannot be sent to a wildcard origin, and
 * it lets any site call your API.
 */
const allowed = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  // Unknown origin: return no CORS headers at all, so the browser blocks it.
  if (!origin || !allowed.includes(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default function proxy(req: NextRequest) {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  // Preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
