'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import ImageUpload from '@/components/admin/ImageUpload';
import Confirm from '@/components/admin/Confirm';

interface Banner {
  id: string; categoryId: string | null;
  title: string; subtitle: string | null; cta: string | null;
  image: string; link: string | null; isActive: boolean; sortOrder: number;
}
interface Category { id: string; name: string }

const blank = () => ({
  categoryId: null as string | null,
  title: '', subtitle: '', cta: '', image: null as string | null,
  link: '', isActive: true, sortOrder: 0,
});

export default function AdminBanners() {
  const [rows, setRows] = useState<Banner[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<Banner[]>('/api/admin/banners').then(setRows).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api.get<Category[]>('/api/admin/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  function open(b?: Banner) {
    setError('');
    if (b) {
      setEditing(b.id);
      setForm({
        categoryId: b.categoryId,
        title: b.title, subtitle: b.subtitle ?? '', cta: b.cta ?? '',
        image: b.image, link: b.link ?? '', isActive: b.isActive, sortOrder: b.sortOrder,
      });
    } else { setEditing('new'); setForm(blank()); }
  }

  async function save() {
    if (!form.image) { setError('Upload a banner image first.'); return; }
    setSaving(true); setError('');
    const payload = {
      ...form,
      categoryId: form.categoryId,
      image: form.image,
      subtitle: form.subtitle || null,
      cta: form.cta || null,
      link: form.link || null,
    };
    try {
      if (editing === 'new') await api.post('/api/admin/banners', payload);
      else await api.put(`/api/admin/banners/${editing}`, payload);
      setEditing(null);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try { await api.del(`/api/admin/banners/${id}`); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Homepage</p>
          <h1 className="display h2">Banners</h1>
        </div>
        <button className="btn btn-wa btn-sm" onClick={() => open()}>Add banner</button>
      </div>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      {editing && (
        <div className="adm-block solid" style={{ marginBottom: 18 }}>
          <p className="eyebrow">{editing === 'new' ? 'New banner' : 'Editing banner'}</p>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Where it shows</label>
              <select
                className="field" value={form.categoryId ?? ''}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
              >
                <option value="">Homepage</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} page</option>
                ))}
              </select>
              <p className="faint tiny" style={{ margin: '8px 0 0' }}>
                Add several with the same target and they become a slideshow,
                changing every 5 seconds.
              </p>
            </div>
            <div>
              <label className="adm-label">Order</label>
              <input
                className="field price" type="number" min={0} value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
              <p className="faint tiny" style={{ margin: '8px 0 0' }}>
                Lowest shows first.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 14, maxWidth: 520 }}>
            <ImageUpload
              label="Banner image" value={form.image} aspect="21 / 9" maxPx={2400}
              hint="Full width — around 2400 × 1000. Dark images keep the text readable."
              onChange={(image) => setForm({ ...form, image })}
            />
          </div>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Title</label>
              <input className="field" value={form.title}
                     onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="adm-label">Subtitle</label>
              <input className="field" value={form.subtitle}
                     onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
          </div>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Button text</label>
              <input className="field" value={form.cta}
                     onChange={(e) => setForm({ ...form, cta: e.target.value })}
                     placeholder="Shop now" />
            </div>
            <div>
              <label className="adm-label">Links to</label>
              <input className="field" value={form.link}
                     onChange={(e) => setForm({ ...form, link: e.target.value })}
                     placeholder="/products?brand=samsung" />
            </div>
          </div>

          <label className="row tiny" style={{ gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={form.isActive}
                   onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Show on the homepage
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-sm btn-wa" onClick={save} disabled={saving || !form.title}>
              {saving ? 'Saving…' : 'Save banner'}
            </button>
          </div>
        </div>
      )}

      {!rows ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : rows.length === 0 ? (
        <div className="adm-block solid" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            No banners. The carousel hides itself when empty, so the homepage still looks right.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((b) => (
            <div key={b.id} className="adm-block solid" style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt="" style={{
                  width: 140, aspectRatio: '21/9', objectFit: 'cover',
                  borderRadius: 10, border: '1px solid var(--line)',
                }} />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <span className="badge" style={{ marginBottom: 6 }}>
                    {b.categoryId
                      ? `${categories.find((c) => c.id === b.categoryId)?.name ?? 'Category'} page`
                      : 'Homepage'}
                  </span>
                  <div style={{ fontWeight: 600 }}>{b.title}</div>
                  {b.subtitle && <div className="faint tiny">{b.subtitle}</div>}
                  {b.link && <div className="faint tiny price">{b.link}</div>}
                </div>
                <span className="status" data-s={b.isActive ? 'SOLD' : undefined}>
                  {b.isActive ? 'Live' : 'Hidden'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="chip" onClick={() => open(b)}>Edit</button>
                  <Confirm onConfirm={() => remove(b.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
