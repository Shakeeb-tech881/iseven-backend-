'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { SearchIcon } from './Icons';
import type { Brand } from '@/lib/types';

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name_asc', label: 'Name A–Z' },
];

export default function Filters({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get('search') ?? '');

  const apply = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      next.delete('page'); // any filter change resets paging
      router.push(`/products?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  // Debounce so we are not pushing a route on every keystroke.
  useEffect(() => {
    const current = params.get('search') ?? '';
    if (term === current) return;
    const t = setTimeout(() => apply({ search: term || null }), 400);
    return () => clearTimeout(t);
  }, [term, params, apply]);

  const brand = params.get('brand');
  const condition = params.get('condition');
  const inStock = params.get('inStock') === 'true';
  const active = [brand, condition, inStock ? '1' : null, params.get('search')].filter(Boolean).length;

  return (
    <div className="glass filterbar">
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-faint)', display: 'flex',
        }}>
          <SearchIcon />
        </span>
        <input
          className="field"
          style={{ paddingLeft: 40 }}
          placeholder="Search by model or brand"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Search phones"
        />
      </div>

      <div className="filter-scroll">
        <button className="chip" data-on={inStock} onClick={() => apply({ inStock: inStock ? null : 'true' })}>
          In stock
        </button>
        <button className="chip" data-on={condition === 'NEW'} onClick={() => apply({ condition: condition === 'NEW' ? null : 'NEW' })}>
          Brand new
        </button>
        <button className="chip" data-on={condition === 'USED'} onClick={() => apply({ condition: condition === 'USED' ? null : 'USED' })}>
          Pre-owned
        </button>
        {brands.map((b) => (
          <button
            key={b.slug}
            className="chip"
            data-on={brand === b.slug}
            onClick={() => apply({ brand: brand === b.slug ? null : b.slug })}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="between">
        <select
          className="field"
          style={{ width: 'auto', maxWidth: 220 }}
          value={params.get('sort') ?? 'popular'}
          onChange={(e) => apply({ sort: e.target.value })}
          aria-label="Sort products"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {active > 0 && (
          <button
            className="chip"
            onClick={() => { setTerm(''); router.push('/products', { scroll: false }); }}
          >
            Clear {active}
          </button>
        )}
      </div>
    </div>
  );
}
