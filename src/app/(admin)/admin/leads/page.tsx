'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '@/lib/admin-client';
import Confirm from '@/components/admin/Confirm';
import { formatLKR } from '@/lib/format';

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  phoneE164: string;
  email: string | null;
  city: string | null;
  productName: string;
  variantLabel: string | null;
  price: number;
  message: string | null;
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'SOLD' | 'LOST';
  notes: string | null;
  createdAt: string;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'SOLD', 'LOST'] as const;

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    try {
      const qs = status ? `?status=${status}&limit=100` : '?limit=100';
      setLeads(await api.get<Lead[]>(`/api/admin/leads${qs}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  async function setStatus(id: string, status: Lead['status']) {
    // Optimistic: the list should feel instant while someone works a queue.
    setLeads((ls) => ls?.map((l) => (l.id === id ? { ...l, status } : l)) ?? null);
    try {
      await api.patch(`/api/admin/leads/${id}`, { status });
    } catch (e) {
      setError((e as Error).message);
      load(filter);
    }
  }

  async function remove(id: string) {
    setLeads((ls) => ls?.filter((l) => l.id !== id) ?? null);
    try { await api.del(`/api/admin/leads/${id}`); }
    catch (e) { setError((e as Error).message); load(filter); }
  }

  /**
   * The export endpoint needs an Authorization header, so a plain link
   * will not work — fetch it, then hand the browser a blob to download.
   */
  async function exportCsv() {
    setError('');
    try {
      const qs = filter ? `?status=${filter}` : '';
      const res = await fetch(`/api/admin/leads/export${qs}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iseven-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError((e as Error).message); }
  }

  async function saveNote(id: string, notes: string) {
    try {
      await api.patch(`/api/admin/leads/${id}`, { notes });
      setLeads((ls) => ls?.map((l) => (l.id === id ? { ...l, notes } : l)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 18 }}>
        <div>
          <p className="eyebrow">Follow-ups</p>
          <h1 className="display h2">Callback requests</h1>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="filter-scroll" style={{ marginBottom: 18 }}>
        <button className="chip" data-on={filter === ''} onClick={() => setFilter('')}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className="chip" data-on={filter === s} onClick={() => setFilter(s)}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && <div className="note note-bad">{error}</div>}

      {!leads ? (
        <div className="skeleton" style={{ height: 300 }} />
      ) : leads.length === 0 ? (
        <div className="adm-block solid" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted" style={{ margin: 0 }}>
            {filter ? 'Nothing with that status.' : 'No callback requests yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {leads.map((l) => (
            <div key={l.id} className="adm-block solid" style={{ padding: 16 }}>
              <div className="between" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{l.name ?? 'No name given'}</div>
                  <a className="price tiny" href={`https://wa.me/${l.phoneE164.replace('+', '')}`}
                     target="_blank" rel="noopener noreferrer" style={{ color: 'var(--acid)' }}>
                    {l.phone}
                  </a>
                  <div className="faint tiny" style={{ marginTop: 4 }}>
                    {l.productName}
                    {l.variantLabel ? ` · ${l.variantLabel}` : ''} · {formatLKR(l.price)}
                  </div>
                  {l.city && <div className="faint tiny">{l.city}</div>}
                </div>
                <span className="status" data-s={l.status}>{l.status}</span>
              </div>

              {l.message && (
                <p className="muted tiny" style={{
                  margin: '12px 0 0', padding: 10,
                  background: 'var(--bg)', borderRadius: 10,
                }}>
                  {l.message}
                </p>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {STATUSES.map((s) => (
                  <button key={s} className="chip" data-on={l.status === s}
                          onClick={() => setStatus(l.id, s)}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
                <button className="chip" onClick={() => setOpen(open === l.id ? null : l.id)}>
                  {l.notes ? 'Edit note' : 'Add note'}
                </button>
                <Confirm onConfirm={() => remove(l.id)} label="Delete" />
              </div>

              {open === l.id && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    className="field" rows={2} defaultValue={l.notes ?? ''}
                    placeholder="What happened on the call?"
                    onBlur={(e) => saveNote(l.id, e.target.value)}
                  />
                  <p className="faint tiny" style={{ margin: '6px 0 0' }}>Saves when you tap away.</p>
                </div>
              )}

              {l.notes && open !== l.id && (
                <p className="faint tiny" style={{ margin: '10px 0 0' }}>Note: {l.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
