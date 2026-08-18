'use client';

/**
 * Browser-side client for the /api/admin endpoints.
 *
 * Tokens live in localStorage. That is a deliberate trade-off: the API
 * authenticates with Bearer tokens, so a cookie-based session would mean
 * rewriting the auth layer. The admin panel renders no user-supplied
 * HTML, so the XSS surface is small — but if you later display customer
 * messages as rich text, move to httpOnly cookies first.
 *
 * Access tokens last 15 minutes and are refreshed automatically on the
 * first 401, so staff are not logged out mid-edit.
 */

const AT = 'iseven_at';
const RT = 'iseven_rt';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(AT));

export function saveSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(AT, accessToken);
  localStorage.setItem(RT, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(AT);
  localStorage.removeItem(RT);
}

async function refresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(RT);
  if (!refreshToken) return false;

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;

  const json = await res.json();
  saveSession(json.data.accessToken, json.data.refreshToken);
  return true;
}

export class AdminError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();

  const isForm = init.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && retry && (await refresh())) {
    return call<T>(path, init, false);
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/admin/login';
    }
    throw new AdminError(
      res.status,
      json?.error?.message ?? 'Request failed',
      json?.error?.details,
    );
  }

  return json?.data as T;
}

export const api = {
  get:   <T>(p: string) => call<T>(p),
  post:  <T>(p: string, body: unknown) => call<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put:   <T>(p: string, body: unknown) => call<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(p: string, body: unknown) => call<T>(p, { method: 'PATCH', body: JSON.stringify(body) }),
  del:   <T>(p: string) => call<T>(p, { method: 'DELETE' }),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return call<{ url: string; path: string; size: number }>('/api/admin/upload', {
      method: 'POST',
      body: form,
    });
  },
};

/**
 * Phone photos come off a camera at 4MB+. The free Supabase tier gives
 * 1GB of storage, so compressing before upload is the difference between
 * 5,000 images and 250. Done here rather than asking staff to remember.
 */
export async function compressImage(file: File, maxPx = 1400, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
}
