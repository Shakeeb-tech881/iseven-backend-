'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveSession } from '@/lib/admin-client';

export default function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error?.message ?? 'Could not sign in.');
        setBusy(false);
        return;
      }

      if (json.data.user.role === 'CUSTOMER') {
        setError('That account does not have admin access.');
        setBusy(false);
        return;
      }

      saveSession(json.data.accessToken, json.data.refreshToken);
      router.replace('/admin');
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="glass" style={{ padding: 30, width: '100%', maxWidth: 380 }}>
        <div className="logo" style={{ marginBottom: 22 }}>
          <span className="logo-mark">i7</span>
          <span>iSeven Admin</span>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="adm-label" htmlFor="email">Email</label>
            <input id="email" className="field" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <label className="adm-label" htmlFor="password">Password</label>
            <input id="password" className="field" name="password" type="password" required autoComplete="current-password" />
          </div>

          {error && <div className="note note-bad">{error}</div>}

          <button className="btn btn-wa btn-block" disabled={busy} style={{ marginTop: 4 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="faint tiny" style={{ marginTop: 18, marginBottom: 0 }}>
          Staff accounts are created in Supabase. Registering here will not grant access.
        </p>
      </div>
    </div>
  );
}
