'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, compressImage } from '@/lib/admin-client';
import { slugify } from '@/lib/format';

/** Loose shapes: the form holds strings while typing, numbers on submit. */
interface VariantDraft {
  id?: string;
  storage: string;
  ram: string;
  color: string;
  colorHex: string;
  sku: string;
  price: string;
  salePrice: string;
  stockStatus: 'IN_STOCK' | 'PRE_ORDER' | 'SOLD_OUT';
}

/** variantIndex points at a row in `variants`, so it works before save. */
interface ImageDraft { id?: string; url: string; alt: string; variantIndex: number | null }

interface Option { id: string; name: string }

interface AttrList {
  id: string;
  kind: 'STORAGE' | 'RAM' | 'COLOR' | 'OTHER';
  values: { id: string; label: string; hex: string | null }[];
}

const blankVariant = (): VariantDraft => ({
  storage: '', ram: '', color: '', colorHex: '', sku: '',
  price: '', salePrice: '', stockStatus: 'IN_STOCK',
});

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const editing = Boolean(productId);

  const [brands, setBrands] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [attrs, setAttrs] = useState<AttrList[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<'NEW' | 'USED' | 'REFURBISHED'>('NEW');
  const [warrantyType, setWarrantyType] = useState('');
  const [badge, setBadge] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [popularity, setPopularity] = useState(0);
  const [specText, setSpecText] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([blankVariant()]);
  const [images, setImages] = useState<ImageDraft[]>([]);

  // Slug follows the name until someone edits it by hand.
  useEffect(() => {
    if (!slugTouched && !editing) setSlug(slugify(name));
  }, [name, slugTouched, editing]);

  useEffect(() => {
    Promise.all([
      api.get<Option[]>('/api/admin/brands'),
      api.get<Option[]>('/api/admin/categories'),
      api.get<AttrList[]>('/api/admin/attributes'),
    ])
      .then(([b, c, a]) => { setBrands(b); setCategories(c); setAttrs(a); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!productId) return;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    api.get<any>(`/api/admin/products/${productId}`)
      .then((p) => {
        setName(p.name); setSlug(p.slug); setSlugTouched(true);
        setBrandId(p.brand.id); setCategoryId(p.category.id);
        setShortDesc(p.shortDesc ?? ''); setDescription(p.description ?? '');
        setCondition(p.condition); setWarrantyType(p.warrantyType ?? '');
        setBadge(p.badge ?? ''); setIsActive(p.isActive); setIsFeatured(p.isFeatured);
        setPopularity(p.popularity ?? 0);
        setSpecText(
          p.specs ? Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
        );
        setVariants(p.variants.map((v: any) => ({
          id: v.id,
          storage: v.storage ?? '', ram: v.ram ?? '', color: v.color ?? '',
          colorHex: v.colorHex ?? '', sku: v.sku ?? '',
          price: String(v.price), salePrice: v.salePrice != null ? String(v.salePrice) : '',
          stockStatus: v.stockStatus,
        })));
        // Map saved variant ids back to their position in the list.
        const indexById = new Map<string, number>(
          p.variants.map((v: any, idx: number) => [v.id, idx]),
        );
        setImages(p.images.map((i: any) => ({
          id: i.id,
          url: i.url,
          alt: i.alt ?? '',
          variantIndex: i.variantId != null ? indexById.get(i.variantId) ?? null : null,
        })));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [productId]);

  /** Options staff can pick from, defined once under Option lists. */
  const optionsFor = (kind: AttrList['kind']) =>
    attrs.filter((a) => a.kind === kind).flatMap((a) => a.values);

  function patchVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const small = await compressImage(file);
        const { url } = await api.upload(small);
        setImages((prev) => [...prev, { url, alt: '', variantIndex: null }]);
      }
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate here so staff get a clear message rather than a 422 blob.
    if (!brandId || !categoryId) { setError('Choose a brand and a category.'); return; }
    for (const [i, v] of variants.entries()) {
      if (!v.price || Number(v.price) <= 0) {
        setError(`Option ${i + 1} needs a price.`);
        return;
      }
      if (v.salePrice && Number(v.salePrice) >= Number(v.price)) {
        setError(`Option ${i + 1}: the sale price must be lower than the normal price.`);
        return;
      }
    }

    const specs: Record<string, string> = {};
    for (const line of specText.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (k && val) specs[k] = val;
      }
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      brandId, categoryId,
      shortDesc: shortDesc.trim() || null,
      description: description.trim() || null,
      condition,
      warrantyType: warrantyType.trim() || null,
      badge: badge || null,
      specs: Object.keys(specs).length ? specs : null,
      isActive, isFeatured,
      popularity,
      metaTitle: null, metaDesc: null,
      variants: variants.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku.trim() || null,
        storage: v.storage.trim() || null,
        ram: v.ram.trim() || null,
        color: v.color.trim() || null,
        colorHex: v.colorHex.trim() || null,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        stockStatus: v.stockStatus,
        sortOrder: i,
      })),
      images: images.map((img, i) => ({
        ...(img.id ? { id: img.id } : {}),
        url: img.url,
        alt: img.alt.trim() || null,
        variantIndex: img.variantIndex,
        sortOrder: i,
      })),
    };

    setSaving(true);
    try {
      if (editing) await api.put(`/api/admin/products/${productId}`, payload);
      else await api.post('/api/admin/products', payload);
      router.push('/admin/products');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!productId) return;
    if (!confirm('Hide this product from the shop? Inquiry history is kept.')) return;
    try {
      await api.del(`/api/admin/products/${productId}`);
      router.push('/admin/products');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 460 }} />;

  return (
    <form className="adm-form" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">{editing ? 'Editing' : 'New product'}</p>
        <h1 className="display h2">{name || 'Add a phone'}</h1>
      </div>

      {error && <div className="note note-bad">{error}</div>}

      {/* -------- basics -------- */}
      <div className="adm-block solid">
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="adm-label" htmlFor="name">Product name</label>
            <input
              id="name" className="field" value={name} required
              onChange={(e) => setName(e.target.value)}
              placeholder="Samsung Galaxy S24 Ultra 5G"
            />
          </div>

          <div className="adm-grid2">
            <div>
              <label className="adm-label" htmlFor="brand">Brand</label>
              <select id="brand" className="field" value={brandId} required
                      onChange={(e) => setBrandId(e.target.value)}>
                <option value="">Choose…</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="adm-label" htmlFor="cat">Category</label>
              <select id="cat" className="field" value={categoryId} required
                      onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="adm-label" htmlFor="short">One-line description</label>
            <input id="short" className="field" value={shortDesc} maxLength={160}
                   onChange={(e) => setShortDesc(e.target.value)}
                   placeholder="200MP camera with built-in S Pen" />
          </div>

          <div className="adm-grid2">
            <div>
              <label className="adm-label" htmlFor="cond">Condition</label>
              <select id="cond" className="field" value={condition}
                      onChange={(e) => setCondition(e.target.value as typeof condition)}>
                <option value="NEW">Brand new</option>
                <option value="USED">Pre-owned</option>
                <option value="REFURBISHED">Refurbished</option>
              </select>
            </div>
            <div>
              <label className="adm-label" htmlFor="warranty">Warranty</label>
              <input id="warranty" className="field" value={warrantyType}
                     onChange={(e) => setWarrantyType(e.target.value)}
                     placeholder="1 Year Agent Warranty" />
            </div>
          </div>

          <p className="faint tiny" style={{ margin: '-6px 0 0' }}>
            Warranty is the first thing customers ask about. Be specific — &ldquo;agent&rdquo;,
            &ldquo;shop&rdquo;, or &ldquo;none&rdquo;.
          </p>

          <div className="adm-grid2">
            <div>
              <label className="adm-label" htmlFor="badge">Badge</label>
              <select id="badge" className="field" value={badge} onChange={(e) => setBadge(e.target.value)}>
                <option value="">None</option>
                <option value="NEW_ARRIVAL">New arrival</option>
                <option value="BEST_SELLER">Best seller</option>
                <option value="SALE">Sale</option>
                <option value="LIMITED">Limited</option>
              </select>
            </div>
            <div>
              <label className="adm-label" htmlFor="slug">Web address</label>
              <input id="slug" className="field" value={slug}
                     onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <label className="row tiny" style={{ gap: 8 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Show in the shop
            </label>
            <label className="row tiny" style={{ gap: 8 }}>
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              Feature on the homepage
            </label>
          </div>

          {isFeatured && (
            <div style={{ maxWidth: 280 }}>
              <label className="adm-label" htmlFor="pop">Homepage priority</label>
              <input
                id="pop" className="field price" type="number" min={0} max={100}
                value={popularity}
                onChange={(e) => setPopularity(Number(e.target.value))}
              />
              <p className="faint tiny" style={{ margin: '8px 0 0' }}>
                Highest number becomes the big card in the hero. 0–100.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* -------- variants -------- */}
      <div className="adm-block solid">
        <div className="between" style={{ marginBottom: 12 }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Options and prices</p>
            <p className="faint tiny" style={{ margin: '6px 0 0' }}>
              One row per storage and colour combination you actually stock.
            </p>
          </div>
          <button type="button" className="btn btn-sm btn-ghost"
                  onClick={() => setVariants((v) => [...v, blankVariant()])}>
            Add option
          </button>
        </div>

        {variants.map((v, i) => (
          <div key={i} className="adm-variant">
            <div className="between">
              <span className="faint tiny price">Option {i + 1}</span>
              {variants.length > 1 && (
                <button type="button" className="chip"
                        onClick={() => setVariants((vs) => vs.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              )}
            </div>

            <div className="adm-variant-row">
              {/* Datalists rather than dropdowns: staff pick from the saved
                  list, but can still type a size that is not on it yet. */}
              <input className="field" placeholder="Storage — 256GB" value={v.storage}
                     list="opt-storage"
                     onChange={(e) => patchVariant(i, { storage: e.target.value })} />
              <input className="field" placeholder="RAM — 12GB" value={v.ram}
                     list="opt-ram"
                     onChange={(e) => patchVariant(i, { ram: e.target.value })} />
              <input className="field" placeholder="Colour" value={v.color}
                     list="opt-color"
                     onChange={(e) => {
                       const label = e.target.value;
                       const known = optionsFor('COLOR').find((o) => o.label === label);
                       patchVariant(i, {
                         color: label,
                         ...(known?.hex ? { colorHex: known.hex } : {}),
                       });
                     }} />
              <input className="field" type="color" value={v.colorHex || '#888888'}
                     onChange={(e) => patchVariant(i, { colorHex: e.target.value })}
                     title="Colour swatch shown on the product page"
                     style={{ padding: 4, height: 44 }} />
            </div>

            <div className="adm-variant-row">
              <input className="field price" inputMode="numeric" placeholder="Price (Rs.)"
                     value={v.price} onChange={(e) => patchVariant(i, { price: e.target.value })} />
              <input className="field price" inputMode="numeric" placeholder="Sale price (optional)"
                     value={v.salePrice} onChange={(e) => patchVariant(i, { salePrice: e.target.value })} />
              <select className="field" value={v.stockStatus}
                      onChange={(e) => patchVariant(i, { stockStatus: e.target.value as VariantDraft['stockStatus'] })}>
                <option value="IN_STOCK">In stock</option>
                <option value="PRE_ORDER">Pre-order</option>
                <option value="SOLD_OUT">Sold out</option>
              </select>
              <input className="field" placeholder="SKU (optional)" value={v.sku}
                     onChange={(e) => patchVariant(i, { sku: e.target.value })} />
            </div>
          </div>
        ))}
      </div>

      {/* -------- photos -------- */}
      <div className="adm-block solid">
        <p className="eyebrow">Photos</p>

        {images.length > 0 && (
          <div className="adm-thumbs" style={{ marginBottom: 14 }}>
            {images.map((img, i) => (
              <div key={img.url + i} className="adm-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt || 'Product photo'} />
                <button type="button" aria-label="Remove photo"
                        onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="adm-drop">
          <input type="file" accept="image/*" multiple hidden
                 onChange={(e) => onFiles(e.target.files)} />
          <span>{uploading ? 'Uploading…' : 'Tap to add photos'}</span>
          <span className="tiny">Resized and converted automatically before upload</span>
        </label>

        <p className="faint tiny" style={{ margin: '10px 0 0' }}>
          The first photo is the one shown on listing pages.
        </p>

        {/* Photo → colour. This is what makes the gallery switch when a
            customer taps a colour on the shop. Photos left on "All
            colours" show for every option. */}
        {images.length > 0 && variants.some((v) => v.color || v.storage) && (
          <div style={{ marginTop: 18 }}>
            <span className="adm-label">Which colour is each photo?</span>
            <div style={{ display: 'grid', gap: 8 }}>
              {images.map((img, i) => (
                <div key={img.url + i}
                     style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" style={{
                    width: 42, height: 42, objectFit: 'contain',
                    borderRadius: 8, border: '1px solid var(--line)',
                    background: 'var(--bg)', flex: 'none',
                  }} />
                  <select
                    className="field"
                    value={img.variantIndex ?? ''}
                    onChange={(e) =>
                      setImages((prev) => prev.map((x, idx) =>
                        idx === i
                          ? { ...x, variantIndex: e.target.value === '' ? null : Number(e.target.value) }
                          : x))}
                  >
                    <option value="">All colours</option>
                    {variants.map((v, vi) => {
                      const label = [v.color, v.storage].filter(Boolean).join(' · ');
                      return (
                        <option key={vi} value={vi}>
                          {label || `Option ${vi + 1}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>
            <p className="faint tiny" style={{ margin: '10px 0 0' }}>
              A photo set to a colour shows only when a customer picks that colour.
              Leave a general shot on &ldquo;All colours&rdquo; and it always shows.
            </p>
          </div>
        )}

        <datalist id="opt-storage">
          {optionsFor('STORAGE').map((o) => <option key={o.id} value={o.label} />)}
        </datalist>
        <datalist id="opt-ram">
          {optionsFor('RAM').map((o) => <option key={o.id} value={o.label} />)}
        </datalist>
        <datalist id="opt-color">
          {optionsFor('COLOR').map((o) => <option key={o.id} value={o.label} />)}
        </datalist>
      </div>

      {/* -------- details -------- */}
      <div className="adm-block solid">
        <p className="eyebrow">Details</p>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label className="adm-label" htmlFor="desc">Full description</label>
            <textarea id="desc" className="field" rows={4} value={description}
                      onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="adm-label" htmlFor="specs">Specification</label>
            <textarea
              id="specs" className="field" rows={7} value={specText}
              onChange={(e) => setSpecText(e.target.value)}
              placeholder={'Display: 6.8" AMOLED, 120Hz\nProcessor: Snapdragon 8 Gen 3\nBattery: 5000mAh'}
              style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.85rem' }}
            />
            <p className="faint tiny" style={{ margin: '8px 0 0' }}>
              One per line, as <span className="price">Label: value</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="adm-bar">
        {editing && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={onDelete}
                  style={{ marginRight: 'auto' }}>
            Hide from shop
          </button>
        )}
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button className="btn btn-sm btn-wa" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to shop'}
        </button>
      </div>
    </form>
  );
}
