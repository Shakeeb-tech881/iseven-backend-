'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';

interface Staff {
  id: string; name: string | null; email: string | null; phone: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN'; isActive: boolean; createdAt: string;
}

export default function AdminStaff() {
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    api.get<Staff[]>('/api/admin/staff').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function update(id: string, patch: Partial<Pick<Staff, 'role' | 'isActive'>>) {
    setError('');
    try { await api.patch(`/api/admin/staff/${id}`, patch); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <p className="eyebrow">Access</p>
      <h1 className="display h2" style={{ marginBottom: 8 }}>Staff</h1>
      <p className="muted tiny" style={{ maxWidth: '62ch', marginBottom: 20 }}>
        Anyone with STAFF or ADMIN can sign in here. Only ADMIN can change roles or
        delete products.
      </p>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="adm-block solid" style={{ marginBottom: 16, padding: 18 }}>
        <p className="eyebrow">Adding someone</p>
        <p className="muted tiny" style={{ margin: 0 }}>
          Ask them to register on the shop with their email, then promote them here.
          There is no &ldquo;create staff&rdquo; button on purpose — an admin panel that can
          mint its own accounts is a much bigger target if anyone gets in.
        </p>
      </div>

      {!rows ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : rows.length === 0 ? (
        <div className="adm-block solid" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted" style={{ margin: 0 }}>No staff accounts yet.</p>
        </div>
      ) : (
        <div className="adm-block solid" style={{ padding: 6 }}>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 550 }}>{u.name ?? '—'}</td>
                    <td className="muted tiny">{u.email}</td>
                    <td>
                      <select
                        className="field" style={{ padding: '6px 10px', width: 'auto' }}
                        value={u.role}
                        onChange={(e) => update(u.id, { role: e.target.value as Staff['role'] })}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="STAFF">Staff</option>
                        <option value="CUSTOMER">Remove access</option>
                      </select>
                    </td>
                    <td>
                      <span className="status" data-s={u.isActive ? 'SOLD' : undefined}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="chip" onClick={() => update(u.id, { isActive: !u.isActive })}>
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
