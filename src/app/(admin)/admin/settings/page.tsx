'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';

interface Shop {
  name: string; whatsapp: string; email: string | null;
  addressLine: string | null; mapUrl: string | null; hours: string | null;
  footerBlurb: string | null;
  facebook: string | null; instagram: string | null; tiktok: string | null;
}
interface Nav {
  showCategories: boolean;
  maxCategories: number;
  shopLabel: string;
  extra: { label: string; href: string }[];
}

export default function AdminSettings() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [nav, setNav] = useState<Nav | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Shop>('/api/admin/settings?key=shop'),
      api.get<Nav>('/api/admin/settings?key=nav'),
    ])
      .then(([s, n]) => { setShop(s); setNav(n); })
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    if (!shop || !nav) return;
    setSaving(true); setError(''); setSaved('');
    try {
      await api.put('/api/admin/settings?key=shop', shop);
      await api.put('/api/admin/settings?key=nav', nav);
      setSaved('Saved. Reload the shop to see it.');
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  if (error && !shop) return <div className="note note-bad">{error}</div>;
  if (!shop || !nav) return <div className="skeleton" style={{ height: 400 }} />;

  const field = (
    label: string,
    key: keyof Shop,
    placeholder = '',
  ) => (
    <div>
      <label className="adm-label">{label}</label>
      <input
        className="field"
        value={(shop[key] as string) ?? ''}
        placeholder={placeholder}
        onChange={(e) => { setShop({ ...shop, [key]: e.target.value }); setSaved(''); }}
      />
    </div>
  );

  return (
    <>
      <p className="eyebrow">Shop</p>
      <h1 className="display h2" style={{ marginBottom: 20 }}>Settings</h1>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}
      {saved && <div className="note note-ok" style={{ marginBottom: 14 }}>{saved}</div>}

      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Contact</p>
        <div className="adm-grid2" style={{ marginBottom: 14 }}>
          {field('Shop name', 'name')}
          <div>
            <label className="adm-label">WhatsApp number</label>
            <input
              className="field price" value={shop.whatsapp}
              placeholder="94777655565"
              onChange={(e) => { setShop({ ...shop, whatsapp: e.target.value }); setSaved(''); }}
            />
            <p className="faint tiny" style={{ margin: '8px 0 0' }}>
              Digits only. Country code first, no plus, no leading zero.
            </p>
          </div>
        </div>
        <div className="adm-grid2" style={{ marginBottom: 14 }}>
          {field('Email', 'email')}
          {field('Opening hours', 'hours', 'Mon–Sat, 9am–7pm')}
        </div>
        <div className="adm-grid2">
          {field('Address', 'addressLine')}
          {field('Google Maps link', 'mapUrl')}
        </div>
      </div>

      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Footer</p>
        <label className="adm-label">About text</label>
        <textarea
          className="field" rows={3} value={shop.footerBlurb ?? ''}
          onChange={(e) => { setShop({ ...shop, footerBlurb: e.target.value }); setSaved(''); }}
        />
        <div className="adm-grid2" style={{ marginTop: 14 }}>
          {field('Facebook', 'facebook')}
          {field('Instagram', 'instagram')}
        </div>
        <div style={{ marginTop: 14, maxWidth: '50%' }}>{field('TikTok', 'tiktok')}</div>
      </div>

      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Menu</p>

        <div style={{ maxWidth: 280, marginBottom: 16 }}>
          <label className="adm-label">Label for the full catalogue</label>
          <input
            className="field" value={nav.shopLabel ?? 'All Products'}
            placeholder="All Products"
            onChange={(e) => { setNav({ ...nav, shopLabel: e.target.value }); setSaved(''); }}
          />
          <p className="faint tiny" style={{ margin: '8px 0 0' }}>
            Always shown, so customers can reach every product rather than
            only the categories listed below.
          </p>
        </div>

        <label className="row tiny" style={{ gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox" checked={nav.showCategories}
            onChange={(e) => { setNav({ ...nav, showCategories: e.target.checked }); setSaved(''); }}
          />
          Put categories in the menu
        </label>

        {nav.showCategories ? (
          <div style={{ maxWidth: 260, marginBottom: 16 }}>
            <label className="adm-label">How many to show</label>
            <input
              className="field price" type="number" min={0} max={8} value={nav.maxCategories}
              onChange={(e) => { setNav({ ...nav, maxCategories: Number(e.target.value) }); setSaved(''); }}
            />
            <p className="faint tiny" style={{ margin: '8px 0 0' }}>
              Taken in category sort order. Any beyond this are still reachable from the shop page.
            </p>
          </div>
        ) : (
          <p className="faint tiny" style={{ marginTop: 0 }}>
            Only the catalogue link above will show.
          </p>
        )}

        <div className="between" style={{ marginBottom: 10 }}>
          <span className="adm-label" style={{ margin: 0 }}>Extra links</span>
          <button className="chip"
                  onClick={() => setNav({ ...nav, extra: [...nav.extra, { label: '', href: '' }] })}>
            Add link
          </button>
        </div>

        {nav.extra.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="field" placeholder="Contact" value={e.label}
                   onChange={(ev) => setNav({
                     ...nav,
                     extra: nav.extra.map((x, idx) => idx === i ? { ...x, label: ev.target.value } : x),
                   })} />
            <input className="field" placeholder="/contact" value={e.href}
                   onChange={(ev) => setNav({
                     ...nav,
                     extra: nav.extra.map((x, idx) => idx === i ? { ...x, href: ev.target.value } : x),
                   })} />
            <button className="chip" style={{ flex: 'none' }}
                    onClick={() => setNav({ ...nav, extra: nav.extra.filter((_, idx) => idx !== i) })}>
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="adm-bar">
        <button className="btn btn-sm btn-wa" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </>
  );
}
