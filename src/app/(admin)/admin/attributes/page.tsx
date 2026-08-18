'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import Confirm from '@/components/admin/Confirm';

interface Value { id?: string; label: string; hex: string | null; sortOrder: number }
interface Attribute {
  id: string; name: string; slug: string;
  kind: 'STORAGE' | 'RAM' | 'COLOR' | 'OTHER';
  sortOrder: number; isActive: boolean; values: Value[];
}

const blank = () => ({
  name: '', slug: '', kind: 'OTHER' as Attribute['kind'],
  sortOrder: 0, isActive: true, values: [] as Value[],
});

export default function AdminAttributes() {
  const [rows, setRows] = useState<Attribute[] | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<Attribute[]>('/api/admin/attributes').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function open(a?: Attribute) {
    setError('');
    if (a) {
      setEditing(a.id);
      setForm({
        name: a.name, slug: a.slug, kind: a.kind,
        sortOrder: a.sortOrder, isActive: a.isActive,
        values: a.values.map((v) => ({ ...v })),
      });
    } else { setEditing('new'); setForm(blank()); }
  }

  function patchValue(i: number, patch: Partial<Value>) {
    setForm((f) => ({
      ...f,
      values: f.values.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    }));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        values: form.values
          .filter((v) => v.label.trim())
          .map((v, i) => ({ ...v, hex: v.hex || null, sortOrder: i })),
      };
      if (editing === 'new') await api.post('/api/admin/attributes', payload);
      else await api.put(`/api/admin/attributes/${editing}`, payload);
      setEditing(null);
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    try { await api.del(`/api/admin/attributes/${id}`); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <div className="between" style={{ marginBottom: 8 }}>
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="display h2">Option lists</h1>
        </div>
        <button className="btn btn-wa btn-sm" onClick={() => open()}>Add list</button>
      </div>

      <p className="muted tiny" style={{ maxWidth: '62ch', marginBottom: 20 }}>
        The storage sizes, RAM and colours staff choose from when adding a phone.
        Defining them once stops &ldquo;256GB&rdquo; and &ldquo;256 GB&rdquo; ending up as two
        different filters on the shop.
      </p>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}

      {editing && (
        <div className="adm-block solid" style={{ marginBottom: 18 }}>
          <p className="eyebrow">{editing === 'new' ? 'New list' : 'Editing list'}</p>

          <div className="adm-grid2" style={{ marginBottom: 14 }}>
            <div>
              <label className="adm-label">List name</label>
              <input className="field" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })}
                     placeholder="Storage" />
            </div>
            <div>
              <label className="adm-label">Type</label>
              <select className="field" value={form.kind}
                      onChange={(e) => setForm({ ...form, kind: e.target.value as Attribute['kind'] })}>
                <option value="STORAGE">Storage</option>
                <option value="RAM">RAM</option>
                <option value="COLOR">Colour</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="between" style={{ marginBottom: 10 }}>
            <span className="adm-label" style={{ margin: 0 }}>Options</span>
            <button className="chip"
                    onClick={() => setForm((f) => ({
                      ...f,
                      values: [...f.values, { label: '', hex: f.kind === 'COLOR' ? '#888888' : null, sortOrder: f.values.length }],
                    }))}>
              Add option
            </button>
          </div>

          {form.values.length === 0 && (
            <p className="faint tiny" style={{ marginTop: 0 }}>No options yet.</p>
          )}

          {form.values.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="field" value={v.label} placeholder="256GB"
                     onChange={(e) => patchValue(i, { label: e.target.value })} />
              {form.kind === 'COLOR' && (
                <input className="field" type="color" value={v.hex ?? '#888888'}
                       onChange={(e) => patchValue(i, { hex: e.target.value })}
                       title="Swatch colour shown on the product page"
                       style={{ width: 60, padding: 4, height: 44, flex: 'none' }} />
              )}
              <button className="chip" style={{ flex: 'none' }}
                      onClick={() => setForm((f) => ({ ...f, values: f.values.filter((_, idx) => idx !== i) }))}>
                ×
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-sm btn-wa" onClick={save} disabled={saving || !form.name}>
              {saving ? 'Saving…' : 'Save list'}
            </button>
          </div>
        </div>
      )}

      {!rows ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((a) => (
            <div key={a.id} className="adm-block solid" style={{ padding: 16 }}>
              <div className="between" style={{ marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span className="faint tiny price" style={{ marginLeft: 10 }}>{a.kind}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="chip" onClick={() => open(a)}>Edit</button>
                  <Confirm onConfirm={() => remove(a.id)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {a.values.length === 0
                  ? <span className="faint tiny">No options</span>
                  : a.values.map((v) => (
                      <span key={v.id} className="chip" style={{ cursor: 'default' }}>
                        {v.hex && (
                          <span style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: v.hex, border: '1px solid rgba(255,255,255,.25)',
                          }} />
                        )}
                        {v.label}
                      </span>
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
