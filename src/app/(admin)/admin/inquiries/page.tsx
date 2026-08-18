'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import { formatLKR } from '@/lib/format';

interface Data {
  total: number;
  recent: { id: string; productName: string; variantLabel: string | null; price: number; source: string | null; createdAt: string }[];
  topProducts: { name: string; count: number }[];
  bySource: { source: string; count: number }[];
  byDay: { day: string; count: number }[];
}

export default function AdminInquiries() {
  const [data, setData] = useState<Data | null>(null);
  const [days, setDays] = useState('30');
  const [error, setError] = useState('');

  const load = useCallback((d: string) => {
    setData(null);
    api.get<Data>(`/api/admin/inquiries?days=${d}`).then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const peak = Math.max(1, ...(data?.byDay ?? []).map((d) => d.count));

  return (
    <>
      <p className="eyebrow">Demand</p>
      <h1 className="display h2" style={{ marginBottom: 8 }}>WhatsApp clicks</h1>
      <p className="muted tiny" style={{ maxWidth: '62ch', marginBottom: 18 }}>
        Every tap of an inquiry button. With no checkout on the site, this is the only
        record of what customers actually want — treat it as your restocking list.
      </p>

      <div className="filter-scroll" style={{ marginBottom: 18 }}>
        {[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days']].map(([v, label]) => (
          <button key={v} className="chip" data-on={days === v} onClick={() => setDays(v)}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="note note-bad">{error}</div>}
      {!data ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : data.total === 0 ? (
        <div className="adm-block solid" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            No clicks in this period yet. Once customers start tapping through to WhatsApp,
            the phones they want will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="adm-cards" style={{ marginBottom: 16 }}>
            <div className="adm-card">
              <div className="n">{data.total}</div>
              <div className="faint tiny">Total clicks</div>
            </div>
            {data.bySource.map((s) => (
              <div className="adm-card" key={s.source}>
                <div className="n">{s.count}</div>
                <div className="faint tiny">
                  From {s.source === 'product_page' ? 'product page'
                    : s.source === 'card' ? 'listing card' : s.source}
                </div>
              </div>
            ))}
          </div>

          <div className="adm-block solid" style={{ marginBottom: 16 }}>
            <p className="eyebrow">By day</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 }}>
              {data.byDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.count}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (d.count / peak) * 100)}%`,
                    background: 'var(--acid)',
                    borderRadius: '3px 3px 0 0',
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
            <p className="faint tiny" style={{ margin: '10px 0 0' }}>
              {data.byDay[0]?.day} to {data.byDay[data.byDay.length - 1]?.day}
            </p>
          </div>

          <div className="adm-block solid" style={{ marginBottom: 16 }}>
            <p className="eyebrow">Most wanted</p>
            {data.topProducts.map((p) => (
              <div key={p.name} className="emi-row">
                <span style={{ fontSize: '0.9rem' }}>{p.name}</span>
                <span className="price">{p.count}</span>
              </div>
            ))}
          </div>

          <div className="adm-block solid" style={{ padding: 6 }}>
            <div className="adm-scroll">
              <table className="adm-table">
                <thead><tr><th>When</th><th>Product</th><th>Option</th><th>Price</th></tr></thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.id}>
                      <td className="faint tiny">{new Date(r.createdAt).toLocaleString('en-LK')}</td>
                      <td>{r.productName}</td>
                      <td className="muted tiny">{r.variantLabel ?? '—'}</td>
                      <td className="price">{formatLKR(r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
