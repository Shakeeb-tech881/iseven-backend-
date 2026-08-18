'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import Confirm from '@/components/admin/Confirm';
import { formatLKR } from '@/lib/format';

interface Plan {
  id: string; bankName: string; logo: string | null;
  months: number; interestPct: number; minAmount: number;
  isActive: boolean; sortOrder: number;
}

const blank = () => ({
  bankName: '', logo: null as string | null, months: 12,
  interestPct: 0, minAmount: 0, isActive: true, sortOrder: 0,
});

export default function AdminPlans() {
  const [rows, setRows] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<Plan[]>('/api/admin/plans').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function open(p?: Plan) {
    setError('');
    if (p) {
      setEditing(p.id);
      setForm({
        bankName: p.bankName, logo: p.logo, months: p.months,
        interestPct: p.interestPct, minAmount: p.minAmount,
        isActive: p.isActive, sortOrder: p.sortOrder,
      });
    } else { setEditing('new'); setForm(blank()); }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      if (editing === 'new') await api.post('/api/admin/plans', form);
      else await api.put(`/api/admin/plans/${editing}`, form);
      setEditing(null);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try { await api.del(`/api/admin/plans/${id}`); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 8 }}>
        <div>
          <p className="eyebrow">Shop</p>
          <h1 className="display h2">Instalment plans</h1>
        </div>
        <button className="btn btn-wa btn-sm" onClick={() => open()}>Add plan</button>
      </div>

      <p className="muted tiny" style={{ maxWidth: '62ch', marginBottom: 20 }}>
        Shown as a monthly figure on product pages. Display only — nothing is charged here,
        so keep the rates matching what the banks actually offer.
      </p>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      {editing && (
        <div className="adm-block solid" style={{ marginBottom: 18 }}>
          <p className="eyebrow">{editing === 'new' ? 'New plan' : 'Editing plan'}</p>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Bank</label>
              <input className="field" value={form.bankName}
                     onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                     placeholder="Commercial Bank" />
            </div>
            <div>
              <label className="adm-label">Months</label>
              <input className="field price" type="number" min={1} max={60} value={form.months}
                     onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} />
            </div>
          </div>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Interest %</label>
              <input className="field price" type="number" step="0.1" min={0} value={form.interestPct}
                     onChange={(e) => setForm({ ...form, interestPct: Number(e.target.value) })} />
            </div>
            <div>
              <label className="adm-label">Minimum price (Rs.)</label>
              <input className="field price" type="number" min={0} value={form.minAmount}
                     onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
            </div>
          </div>

          <label className="row tiny" style={{ gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={form.isActive}
                   onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Offer this plan
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-sm btn-wa" onClick={save} disabled={saving || !form.bankName}>
              {saving ? 'Saving…' : 'Save plan'}
            </button>
          </div>
        </div>
      )}

      {!rows ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : (
        <div className="adm-block solid" style={{ padding: 6 }}>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead>
                <tr><th>Bank</th><th>Months</th><th>Interest</th><th>From</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 550 }}>{p.bankName}</td>
                    <td className="price">{p.months}</td>
                    <td className="price">{p.interestPct === 0 ? '0%' : `${p.interestPct}%`}</td>
                    <td className="price">{formatLKR(p.minAmount)}</td>
                    <td>
                      <span className="status" data-s={p.isActive ? 'SOLD' : undefined}>
                        {p.isActive ? 'Live' : 'Off'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="chip" onClick={() => open(p)}>Edit</button>{' '}
                      <Confirm onConfirm={() => remove(p.id)} />
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
