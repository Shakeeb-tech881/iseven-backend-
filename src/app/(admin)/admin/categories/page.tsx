'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import ImageUpload from '@/components/admin/ImageUpload';
import Confirm from '@/components/admin/Confirm';

interface Category {
  id: string; name: string; slug: string;
  icon: string | null; image: string | null;
  sortOrder: number; isActive: boolean;
}

const blank = () => ({
  name: '', slug: '', icon: '', image: null as string | null,
  sortOrder: 0, isActive: true,
});

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<Category[]>('/api/admin/categories').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function open(c?: Category) {
    setError('');
    if (c) {
      setEditing(c.id);
      setForm({
        name: c.name, slug: c.slug, icon: c.icon ?? '',
        image: c.image, sortOrder: c.sortOrder, isActive: c.isActive,
      });
    } else { setEditing('new'); setForm(blank()); }
  }

  async function save() {
    setSaving(true); setError('');
    const payload = { ...form, icon: form.icon || null };
    try {
      if (editing === 'new') await api.post('/api/admin/categories', payload);
      else await api.put(`/api/admin/categories/${editing}`, payload);
      setEditing(null);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try { await api.del(`/api/admin/categories/${id}`); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="display h2">Categories</h1>
        </div>
        <button className="btn btn-wa btn-sm" onClick={() => open()}>Add category</button>
      </div>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      {editing && (
        <div className="adm-block solid" style={{ marginBottom: 18 }}>
          <p className="eyebrow">{editing === 'new' ? 'New category' : 'Editing category'}</p>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Name</label>
              <input className="field" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })}
                     placeholder="Smartphones" />
            </div>
            <div>
              <label className="adm-label">Sort order</label>
              <input className="field price" type="number" value={form.sortOrder}
                     onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>

          <div style={{ marginBottom: 14, maxWidth: 340 }}>
            <ImageUpload
              label="Category image" value={form.image} aspect="4 / 3"
              hint="Shown on category tiles"
              onChange={(image) => setForm({ ...form, image })}
            />
          </div>

          <label className="row tiny" style={{ gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={form.isActive}
                   onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Show on the site
          </label>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-sm btn-wa" onClick={save} disabled={saving || !form.name}>
              {saving ? 'Saving…' : 'Save category'}
            </button>
          </div>
        </div>
      )}

      {!rows ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : (
        <div className="adm-block solid" style={{ padding: 6 }}>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>Image</th><th>Category</th><th>Slug</th><th>Order</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td style={{ width: 56 }}>
                      {c.image
                        /* eslint-disable-next-line @next/next/no-img-element */
                        ? <img src={c.image} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 6 }} />
                        : <span className="faint tiny">—</span>}
                    </td>
                    <td style={{ fontWeight: 550 }}>{c.name}</td>
                    <td className="faint tiny price">{c.slug}</td>
                    <td className="faint">{c.sortOrder}</td>
                    <td>
                      <span className="status" data-s={c.isActive ? 'SOLD' : undefined}>
                        {c.isActive ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="chip" onClick={() => open(c)}>Edit</button>{' '}
                      <Confirm onConfirm={() => remove(c.id)} />
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
