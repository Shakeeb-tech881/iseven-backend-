'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import Confirm from '@/components/admin/Confirm';
import { formatLKR } from '@/lib/format';

interface Row {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  condition: string;
  brand: { name: string } | null;
  category: { name: string } | null;
  variants: { id: string; price: string | number; salePrice: string | number | null; stockStatus: string }[];
}

type Filter = 'all' | 'live' | 'hidden' | 'sold_out';

export default function AdminProducts() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (term: string) => {
    try {
      const qs = term ? `?search=${encodeURIComponent(term)}&limit=100` : '?limit=100';
      setRows(await api.get<Row[]>(`/api/admin/products${qs}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  function lowest(v: Row['variants']) {
    if (!v.length) return null;
    return Math.min(...v.map((x) => Number(x.salePrice ?? x.price)));
  }

  const allSoldOut = (r: Row) =>
    r.variants.length > 0 && r.variants.every((v) => v.stockStatus === 'SOLD_OUT');

  /** Hide or show without opening the form. */
  async function toggleActive(r: Row) {
    setError('');
    setBusy(r.id);
    // Optimistic — the list should feel immediate while working through stock.
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, isActive: !x.isActive } : x)) ?? null);
    try {
      await api.patch(`/api/admin/products/${r.id}`, { isActive: !r.isActive });
    } catch (e) {
      setError((e as Error).message);
      await load(search);
    } finally {
      setBusy(null);
    }
  }

  /**
   * Permanent. ADMIN only — the API rejects STAFF, so a shop assistant
   * gets a clear message rather than silently wiping a product.
   */
  async function destroy(id: string) {
    setError('');
    setBusy(id);
    try {
      await api.del(`/api/admin/products/${id}?hard=true`);
      setRows((rs) => rs?.filter((r) => r.id !== id) ?? null);
    } catch (e) {
      const msg = (e as Error).message;
      setError(
        msg.includes('permission') || msg.includes('Admin')
          ? 'Only an admin can permanently delete a product. You can hide it instead.'
          : msg,
      );
    } finally {
      setBusy(null);
    }
  }

  async function duplicate(id: string) {
    setError('');
    setBusy(id);
    try {
      await api.post(`/api/admin/products/${id}/duplicate`, {});
      await load(search);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const visible = (rows ?? []).filter((r) => {
    if (filter === 'live') return r.isActive;
    if (filter === 'hidden') return !r.isActive;
    if (filter === 'sold_out') return allSoldOut(r);
    return true;
  });

  return (
    <>
      <div className="between" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="display h2">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn btn-wa btn-sm">Add a phone</Link>
      </div>

      <input
        className="field"
        placeholder="Search products"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <div className="filter-scroll" style={{ marginBottom: 16 }}>
        {([
          ['all', 'All'],
          ['live', 'Live'],
          ['hidden', 'Hidden'],
          ['sold_out', 'Sold out'],
        ] as [Filter, string][]).map(([v, label]) => (
          <button key={v} className="chip" data-on={filter === v} onClick={() => setFilter(v)}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      {!rows ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : visible.length === 0 ? (
        <div className="adm-block solid" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            {search ? 'Nothing matches that search.'
              : filter !== 'all' ? 'Nothing with that status.'
              : 'No products yet.'}
          </p>
          {!search && filter === 'all' && (
            <Link href="/admin/products/new" className="btn btn-sm btn-wa">Add the first one</Link>
          )}
        </div>
      ) : (
        <div className="adm-block solid" style={{ padding: 6 }}>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th><th>Brand</th><th>From</th>
                  <th>Options</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const price = lowest(r.variants);
                  const out = allSoldOut(r);
                  return (
                    <tr key={r.id} style={busy === r.id ? { opacity: 0.5 } : undefined}>
                      <td>
                        <div style={{ fontWeight: 550 }}>
                          {r.name}
                          {r.isFeatured && (
                            <span className="badge" style={{ marginLeft: 8 }}>Featured</span>
                          )}
                        </div>
                        <div className="faint tiny code">{r.slug}</div>
                      </td>
                      <td className="muted">{r.brand?.name ?? '—'}</td>
                      <td className="price">{price !== null ? formatLKR(price) : '—'}</td>
                      <td className="muted">{r.variants.length}</td>
                      <td>
                        {!r.isActive ? (
                          <span className="status">Hidden</span>
                        ) : out ? (
                          <span className="status">Sold out</span>
                        ) : (
                          <span className="status" data-s="SOLD">Live</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <button className="chip" onClick={() => toggleActive(r)}>
                            {r.isActive ? 'Hide' : 'Show'}
                          </button>
                          <button className="chip" onClick={() => duplicate(r.id)}>Duplicate</button>
                          <Confirm
                            onConfirm={() => destroy(r.id)}
                            label="Delete"
                            confirmLabel="Delete forever?"
                          />
                          <Link href={`/admin/products/${r.id}`} className="btn btn-sm btn-ghost">
                            Edit
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="faint tiny" style={{ marginTop: 16, maxWidth: '62ch' }}>
        <strong>Hide</strong> takes a phone off the shop but keeps everything, so you can put
        it back when stock returns — that is the right choice almost every time.
        <strong> Delete</strong> is permanent and admin-only. Past WhatsApp click history
        survives either way, because it stores the product name as text rather than a link.
      </p>
    </>
  );
}
