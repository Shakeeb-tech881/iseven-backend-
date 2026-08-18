'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/admin-client';
import ImageUpload from '@/components/admin/ImageUpload';

interface Hero {
  mode: 'featured' | 'custom';
  image: string | null;
  spotlightProductId: string | null;
  spotlightLabel: string | null;
  blur: number;
  dim: number;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  primaryLabel: string | null;
  primaryHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  statsEnabled: boolean;
  stat1Value: string | null; stat1Label: string | null;
  stat2Value: string | null; stat2Label: string | null;
  stat3Value: string | null; stat3Label: string | null;
}

/**
 * Every field has a defined value here, never undefined.
 *
 * A hero row saved before the blur controls existed has no `blur` key,
 * so the slider would mount with value={undefined} and React would warn
 * about an input switching from uncontrolled to controlled. Merging
 * against these defaults on load means the form works against any
 * version of the stored setting, migrated or not.
 */
const DEFAULTS: Hero = {
  mode: 'featured',
  image: null,
  spotlightProductId: null,
  spotlightLabel: 'Most asked about',
  blur: 30,
  dim: 45,
  eyebrow: '',
  title: '',
  subtitle: '',
  primaryLabel: '',
  primaryHref: '',
  secondaryLabel: '',
  secondaryHref: '',
  statsEnabled: true,
  stat1Value: '', stat1Label: '',
  stat2Value: '', stat2Label: '',
  stat3Value: '', stat3Label: '',
};

/** Coerce whatever the API returns into a fully-populated form state. */
function normalise(raw: Partial<Hero> | null): Hero {
  const merged = { ...DEFAULTS, ...(raw ?? {}) };
  return {
    ...merged,
    // Nulls are valid in the database but break text inputs.
    eyebrow: merged.eyebrow ?? '',
    subtitle: merged.subtitle ?? '',
    primaryLabel: merged.primaryLabel ?? '',
    primaryHref: merged.primaryHref ?? '',
    secondaryLabel: merged.secondaryLabel ?? '',
    secondaryHref: merged.secondaryHref ?? '',
    spotlightLabel: merged.spotlightLabel ?? '',
    spotlightProductId: merged.spotlightProductId ?? null,
    stat1Value: merged.stat1Value ?? '', stat1Label: merged.stat1Label ?? '',
    stat2Value: merged.stat2Value ?? '', stat2Label: merged.stat2Label ?? '',
    stat3Value: merged.stat3Value ?? '', stat3Label: merged.stat3Label ?? '',
    blur: Number.isFinite(Number(merged.blur)) ? Number(merged.blur) : DEFAULTS.blur,
    dim: Number.isFinite(Number(merged.dim)) ? Number(merged.dim) : DEFAULTS.dim,
    statsEnabled: Boolean(merged.statsEnabled),
    title: merged.title ?? '',
  };
}

interface PickerRow {
  id: string;
  name: string;
  isActive: boolean;
  variants: { price: string | number; salePrice: string | number | null }[];
}

export default function AdminHero() {
  const [hero, setHero] = useState<Hero | null>(null);
  const [products, setProducts] = useState<PickerRow[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Partial<Hero> | null>('/api/admin/settings?key=hero')
      .then((raw) => setHero(normalise(raw)))
      .catch((e) => setError(e.message));

    api.get<PickerRow[]>('/api/admin/products?limit=100')
      .then((rows) => setProducts(rows.filter((r) => r.isActive)))
      .catch(() => setProducts([]));
  }, []);

  function set<K extends keyof Hero>(key: K, value: Hero[K]) {
    setHero((h) => (h ? { ...h, [key]: value } : h));
    setSaved(false);
  }

  async function save() {
    if (!hero) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      // Empty strings go back as null so the site can fall back cleanly.
      const payload = {
        ...hero,
        eyebrow: hero.eyebrow || null,
        subtitle: hero.subtitle || null,
        spotlightLabel: hero.spotlightLabel || null,
        primaryLabel: hero.primaryLabel || null,
        primaryHref: hero.primaryHref || null,
        secondaryLabel: hero.secondaryLabel || null,
        secondaryHref: hero.secondaryHref || null,
        stat1Value: hero.stat1Value || null, stat1Label: hero.stat1Label || null,
        stat2Value: hero.stat2Value || null, stat2Label: hero.stat2Label || null,
        stat3Value: hero.stat3Value || null, stat3Label: hero.stat3Label || null,
      };
      await api.put('/api/admin/settings?key=hero', payload);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !hero) return <div className="note note-bad">{error}</div>;
  if (!hero) return <div className="skeleton" style={{ height: 420 }} />;

  return (
    <>
      <p className="eyebrow">Homepage</p>
      <h1 className="display h2" style={{ marginBottom: 20 }}>Hero section</h1>

      {error && <div className="note note-bad" style={{ marginBottom: 14 }}>{error}</div>}
      {saved && (
        <div className="note note-ok" style={{ marginBottom: 14 }}>
          Saved. Reload the homepage to see it.
        </div>
      )}

      {/* -------- background -------- */}
      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Background</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="chip" data-on={hero.mode === 'featured'}
                  onClick={() => set('mode', 'featured')}>
            Use featured product photo
          </button>
          <button className="chip" data-on={hero.mode === 'custom'}
                  onClick={() => set('mode', 'custom')}>
            Upload my own image
          </button>
        </div>

        {hero.mode === 'custom' ? (
          <div style={{ maxWidth: 420, marginBottom: 22 }}>
            <ImageUpload
              label="Hero image" value={hero.image} aspect="16 / 9" maxPx={2000}
              hint="Wide and dark works best — it sits behind the headline"
              onChange={(image) => set('image', image)}
            />
          </div>
        ) : (
          <p className="faint tiny" style={{ margin: '0 0 22px' }}>
            The backdrop follows whichever product is featured on the homepage, using the
            one with the highest homepage priority.
          </p>
        )}

        <div className="adm-grid2">
          <div>
            <label className="adm-label" htmlFor="blur">Blur — {hero.blur}px</label>
            <input
              id="blur" type="range" min={0} max={60} value={hero.blur}
              onChange={(e) => set('blur', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--acid)' }}
            />
            <p className="faint tiny" style={{ margin: '6px 0 0' }}>
              0 shows the photo sharp. Higher turns it into a wash of colour.
            </p>
          </div>
          <div>
            <label className="adm-label" htmlFor="dim">Darkness — {hero.dim}%</label>
            <input
              id="dim" type="range" min={0} max={90} value={hero.dim}
              onChange={(e) => set('dim', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--acid)' }}
            />
            <p className="faint tiny" style={{ margin: '6px 0 0' }}>
              Check the headline stays readable after changing this.
            </p>
          </div>
        </div>
      </div>

      {/* -------- spotlight card -------- */}
      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Spotlight card</p>
        <p className="muted tiny" style={{ marginTop: 0, marginBottom: 16 }}>
          The single product shown beside the headline.
        </p>

        <div className="adm-grid2">
          <div>
            <label className="adm-label" htmlFor="spot">Which product</label>
            <select
              id="spot" className="field"
              value={hero.spotlightProductId ?? ''}
              onChange={(e) => set('spotlightProductId', e.target.value || null)}
            >
              <option value="">Automatic — highest priority featured</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="faint tiny" style={{ margin: '8px 0 0' }}>
              If the chosen product is later hidden, the card falls back to automatic
              rather than leaving a gap.
            </p>
          </div>

          <div>
            <label className="adm-label" htmlFor="spotlabel">Card label</label>
            <input
              id="spotlabel" className="field" value={hero.spotlightLabel ?? ''}
              placeholder="Most asked about"
              onChange={(e) => set('spotlightLabel', e.target.value)}
            />
            <p className="faint tiny" style={{ margin: '8px 0 0' }}>
              The small text above the photo. &ldquo;This week&rsquo;s pick&rdquo;,
              &ldquo;Just landed&rdquo;, whatever fits.
            </p>
          </div>
        </div>

        <p className="faint tiny" style={{ margin: '16px 0 0' }}>
          The photo itself is the product&rsquo;s first image — change it under
          Products, in the Photos section.
        </p>
      </div>

      {/* -------- words -------- */}
      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Words</p>

        <div style={{ marginBottom: 14 }}>
          <label className="adm-label" htmlFor="eyebrow">Eyebrow</label>
          <input id="eyebrow" className="field" value={hero.eyebrow ?? ''}
                 onChange={(e) => set('eyebrow', e.target.value)}
                 placeholder="Colombo · Since 2016" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="adm-label" htmlFor="title">Headline</label>
          <textarea id="title" className="field" rows={3} value={hero.title}
                    onChange={(e) => set('title', e.target.value)} />
          <p className="faint tiny" style={{ margin: '8px 0 0' }}>
            Each new line becomes a new line on the page.
          </p>
        </div>

        <div>
          <label className="adm-label" htmlFor="subtitle">Supporting text</label>
          <textarea id="subtitle" className="field" rows={3} value={hero.subtitle ?? ''}
                    onChange={(e) => set('subtitle', e.target.value)} />
        </div>
      </div>

      {/* -------- buttons -------- */}
      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <p className="eyebrow">Buttons</p>
        <div className="adm-grid2" style={{ marginBottom: 14 }}>
          <div>
            <label className="adm-label" htmlFor="p1">Main button</label>
            <input id="p1" className="field" value={hero.primaryLabel ?? ''}
                   onChange={(e) => set('primaryLabel', e.target.value)} />
          </div>
          <div>
            <label className="adm-label" htmlFor="p2">Main button link</label>
            <input id="p2" className="field" value={hero.primaryHref ?? ''}
                   onChange={(e) => set('primaryHref', e.target.value)} placeholder="/products" />
          </div>
        </div>
        <div className="adm-grid2">
          <div>
            <label className="adm-label" htmlFor="s1">Second button</label>
            <input id="s1" className="field" value={hero.secondaryLabel ?? ''}
                   onChange={(e) => set('secondaryLabel', e.target.value)} />
          </div>
          <div>
            <label className="adm-label" htmlFor="s2">Second button link</label>
            <input id="s2" className="field" value={hero.secondaryHref ?? ''}
                   onChange={(e) => set('secondaryHref', e.target.value)} />
          </div>
        </div>
        <p className="faint tiny" style={{ margin: '12px 0 0' }}>
          Leave a label empty to hide that button.
        </p>
      </div>

      {/* -------- stats -------- */}
      <div className="adm-block solid" style={{ marginBottom: 16 }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Stats row</p>
          <label className="row tiny" style={{ gap: 8 }}>
            <input type="checkbox" checked={hero.statsEnabled}
                   onChange={(e) => set('statsEnabled', e.target.checked)} />
            Show
          </label>
        </div>

        {hero.statsEnabled && (
          <>
            {([1, 2, 3] as const).map((n) => {
              const valueKey = `stat${n}Value` as const;
              const labelKey = `stat${n}Label` as const;
              return (
                <div key={n} className="adm-grid2" style={{ marginBottom: 10 }}>
                  <input
                    className="field price" placeholder="9k+"
                    value={hero[valueKey] ?? ''}
                    onChange={(e) => set(valueKey, e.target.value)}
                  />
                  <input
                    className="field" placeholder="Phones sold"
                    value={hero[labelKey] ?? ''}
                    onChange={(e) => set(labelKey, e.target.value)}
                  />
                </div>
              );
            })}
            <p className="faint tiny" style={{ margin: '10px 0 0' }}>
              Use real numbers. A shop claiming 9,000 sales that only stocks four
              phones reads as false, and customers notice. Leave a pair empty to hide it.
            </p>
          </>
        )}
      </div>

      <div className="adm-bar">
        <button className="btn btn-sm btn-wa" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save hero'}
        </button>
      </div>
    </>
  );
}
