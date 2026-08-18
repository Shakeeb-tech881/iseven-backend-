'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import ImageUpload from '@/components/admin/ImageUpload';
import Confirm from '@/components/admin/Confirm';

interface Brand {
  id: string; name: string; slug: string;
  logo: string | null; banner: string | null; tagline: string | null;
  sortOrder: number; isActive: boolean;
}

const blank = () => ({
  name: '', slug: '', logo: null as string | null, banner: null as string | null,
  tagline: '', sortOrder: 0, isActive: true,
});

export default function AdminBrands() {
  const [rows, setRows] = useState<Brand[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api.get<Brand[]>('/api/admin/brands').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function open(b?: Brand) {
    setError('');
    if (b) {
      setEditing(b.id);
      setForm({
        name: b.name, slug: b.slug, logo: b.logo, banner: b.banner,
        tagline: b.tagline ?? '', sortOrder: b.sortOrder, isActive: b.isActive,
      });
    } else {
      setEditing('new');
      setForm(blank());
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    const payload = { ...form, tagline: form.tagline || null };
    try {
      if (editing === 'new') await api.post('/api/admin/brands', payload);
      else await api.put(`/api/admin/brands/${editing}`, payload);
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/api/admin/brands/${id}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="display h2">Brands</h1>
        </div>
        <button className="btn btn-wa btn-sm" onClick={() => open()}>Add brand</button>
      </div>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      {editing && (
        <div className="adm-block solid" style={{ marginBottom: 18 }}>
          <p className="eyebrow">{editing === 'new' ? 'New brand' : 'Editing brand'}</p>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">Name</label>
              <input className="field" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })}
                     placeholder="Samsung" />
            </div>
            <div>
              <label className="adm-label">Tagline</label>
              <input className="field" value={form.tagline}
                     onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                     placeholder="Optional" />
            </div>
          </div>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <ImageUpload
              label="Logo" value={form.logo} hint="Square, transparent PNG works best"
              onChange={(logo) => setForm({ ...form, logo })}
            />
            <ImageUpload
              label="Brand banner" value={form.banner} aspect="21 / 9"
              hint="Wide image for the brand page"
              onChange={(banner) => setForm({ ...form, banner })}
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
              {saving ? 'Saving…' : 'Save brand'}
            </button>
          </div>
        </div>
      )}

      {!rows ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : rows.length === 0 ? (
        <div className="adm-block solid" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted" style={{ marginTop: 0 }}>No brands yet. Add one before your first product.</p>
        </div>
      ) : (
        <div className="adm-block solid" style={{ padding: 6 }}>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>Logo</th><th>Brand</th><th>Slug</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td style={{ width: 56 }}>
                      {b.logo
                        /* eslint-disable-next-line @next/next/no-img-element */
                        ? <img src={b.logo} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                        : <span className="faint tiny">—</span>}
                    </td>
                    <td style={{ fontWeight: 550 }}>{b.name}</td>
                    <td className="faint tiny price">{b.slug}</td>
                    <td>
                      <span className="status" data-s={b.isActive ? 'SOLD' : undefined}>
                        {b.isActive ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="chip" onClick={() => open(b)}>Edit</button>{' '}
                      <Confirm onConfirm={() => remove(b.id)} />
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
