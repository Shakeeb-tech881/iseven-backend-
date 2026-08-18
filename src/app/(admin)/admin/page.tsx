'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import { formatLKR } from '@/lib/format';

interface Stats {
  products: number;
  activeProducts: number;
  newLeads: number;
  inquiriesThisWeek: number;
  topProducts: { name: string; count: number }[];
  recentLeads: {
    id: string; name: string | null; phone: string;
    productName: string; status: string; createdAt: string;
  }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Stats>('/api/admin/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="note note-bad">{error}</div>;
  if (!stats) {
    return (
      <div className="adm-cards">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Overview</p>
      <h1 className="display h2" style={{ marginBottom: 24 }}>Today at iSeven</h1>

      <div className="adm-cards">
        <div className="adm-card">
          <div className="n">{stats.activeProducts}</div>
          <div className="faint tiny">Live products</div>
        </div>
        <div className="adm-card">
          <div className="n">{stats.products - stats.activeProducts}</div>
          <div className="faint tiny">Hidden</div>
        </div>
        <div className="adm-card" style={stats.newLeads > 0 ? { borderColor: 'var(--acid)' } : undefined}>
          <div className="n" style={stats.newLeads > 0 ? { color: 'var(--acid)' } : undefined}>
            {stats.newLeads}
          </div>
          <div className="faint tiny">Leads to call back</div>
        </div>
        <div className="adm-card">
          <div className="n">{stats.inquiriesThisWeek}</div>
          <div className="faint tiny">WhatsApp clicks, 7 days</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
        <div className="adm-block solid">
          <p className="eyebrow">Most asked about this week</p>
          {stats.topProducts.length === 0 ? (
            <p className="faint tiny" style={{ margin: 0 }}>
              No WhatsApp clicks yet. Once customers start tapping through, the phones they
              actually want will show up here — that is your restocking list.
            </p>
          ) : (
            stats.topProducts.map((p) => (
              <div key={p.name} className="emi-row">
                <span style={{ fontSize: '0.9rem' }}>{p.name}</span>
                <span className="price">{p.count}</span>
              </div>
            ))
          )}
        </div>

        <div className="adm-block solid">
          <div className="between" style={{ marginBottom: 14 }}>
            <p className="eyebrow" style={{ margin: 0 }}>Latest callback requests</p>
            <Link href="/admin/leads" className="btn btn-sm btn-ghost">All leads</Link>
          </div>

          {stats.recentLeads.length === 0 ? (
            <p className="faint tiny" style={{ margin: 0 }}>No callback requests yet.</p>
          ) : (
            <div className="adm-scroll">
              <table className="adm-table">
                <tbody>
                  {stats.recentLeads.map((l) => (
                    <tr key={l.id}>
                      <td>{l.name ?? <span className="faint">No name</span>}</td>
                      <td className="price tiny">{l.phone}</td>
                      <td className="muted tiny">{l.productName}</td>
                      <td><span className="status" data-s={l.status}>{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="adm-block solid" style={{ marginTop: 16 }}>
        <p className="eyebrow">Quick actions</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/admin/products/new" className="btn btn-sm btn-wa">Add a phone</Link>
          <Link href="/admin/products" className="btn btn-sm btn-ghost">Edit prices</Link>
        </div>
      </div>
    </>
  );
}
