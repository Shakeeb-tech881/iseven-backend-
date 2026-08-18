'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { formatLKR, effectivePrice, discountPct, variantLabel } from '@/lib/format';
import type { InstallmentPlan, Product, ProductVariant } from '@/lib/types';
import WhatsAppButton from './WhatsAppButton';
import { ShieldIcon } from './Icons';

const STOCK_LABEL = {
  IN_STOCK: 'In stock',
  PRE_ORDER: 'Pre-order',
  SOLD_OUT: 'Sold out',
} as const;

interface Props {
  product: Product;
  plans: InstallmentPlan[];
  whatsappLinks: Record<string, string>;
}

export default function ProductDetail({ product, plans, whatsappLinks }: Props) {
  const variants = product.variants;

  // Open on something a customer can actually buy today.
  const initial = variants.find((v) => v.stockStatus === 'IN_STOCK') ?? variants[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const [imageIndex, setImageIndex] = useState(0);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  const storages = useMemo(
    () => [...new Set(variants.map((v) => v.storage).filter(Boolean))] as string[],
    [variants],
  );
  const colors = useMemo(() => {
    const seen = new Map<string, string | null>();
    for (const v of variants) if (v.color && !seen.has(v.color)) seen.set(v.color, v.colorHex);
    return [...seen.entries()];
  }, [variants]);

  /** Images tagged to this variant, plus untagged ones which always apply. */
  const gallery = useMemo(() => {
    const tagged = product.images.filter((i) => i.variantId === selected.id);
    const general = product.images.filter((i) => i.variantId === null);
    const list = [...tagged, ...general];
    return list.length ? list : product.images;  // may legitimately be empty
  }, [product.images, selected.id]);

  const image = gallery[Math.min(imageIndex, gallery.length - 1)];

  function pick(next: ProductVariant | undefined) {
    if (!next) return;
    setSelectedId(next.id);
    setImageIndex(0);
  }

  function pickStorage(storage: string) {
    pick(
      variants.find((v) => v.storage === storage && v.color === selected.color) ??
      variants.find((v) => v.storage === storage),
    );
  }

  function pickColor(color: string) {
    pick(
      variants.find((v) => v.color === color && v.storage === selected.storage) ??
      variants.find((v) => v.color === color),
    );
  }

  const price = effectivePrice(selected);
  const off = discountPct(selected);
  const soldOut = selected.stockStatus === 'SOLD_OUT';
  const eligible = plans.filter((p) => price >= p.minAmount);

  return (
    <>
      <div className="wrap pdp">
        {/* ---------- gallery ---------- */}
        <div>
          <div className="glass gallery">
            <div className="gallery-main">
              {image ? (
                <Image
                  src={image.url}
                  alt={image.alt ?? product.name}
                  width={900}
                  height={900}
                  priority
                  sizes="(max-width: 900px) 92vw, 540px"
                />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                  <span className="faint tiny">Photo coming soon</span>
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="gallery-strip">
                {gallery.map((img, i) => (
                  <button
                    key={img.id}
                    className="thumb"
                    data-on={i === imageIndex}
                    onClick={() => setImageIndex(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <Image src={img.url} alt="" width={124} height={124} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="glass" style={{ padding: 22, marginTop: 16 }}>
              <p className="eyebrow">Specification</p>
              <table className="specs">
                <tbody>
                  {Object.entries(product.specs).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------- buy panel ---------- */}
        <div className="pdp-aside">
          <div className="glass" style={{ padding: 24 }}>
            <p className="eyebrow">{product.brand.name}</p>
            <h1 className="display h2" style={{ marginBottom: 10 }}>{product.name}</h1>
            {product.shortDesc && <p className="muted" style={{ margin: '0 0 18px' }}>{product.shortDesc}</p>}

            <div className="row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className="price price-lg">{formatLKR(price)}</span>
              {selected.salePrice !== null && (
                <>
                  <span className="price-was">{formatLKR(selected.price)}</span>
                  <span className="badge badge-sale">Save {off}%</span>
                </>
              )}
            </div>

            <div className="row" style={{ gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
              <span className={`badge ${soldOut ? 'badge-out' : 'badge-stock'}`}>
                {STOCK_LABEL[selected.stockStatus]}
              </span>
              {product.condition === 'USED' && <span className="badge badge-used">Pre-owned</span>}
              {selected.sku && <span className="faint tiny code">{selected.sku}</span>}
            </div>

            {storages.length > 1 && (
              <div className="opt-group">
                <span className="opt-label">Storage</span>
                <div className="opt-row">
                  {storages.map((s) => {
                    const any = variants.some((v) => v.storage === s && v.stockStatus !== 'SOLD_OUT');
                    return (
                      <button
                        key={s}
                        className="chip"
                        data-on={selected.storage === s}
                        onClick={() => pickStorage(s)}
                        style={any ? undefined : { opacity: 0.45 }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {colors.length > 1 && (
              <div className="opt-group">
                <span className="opt-label">Colour</span>
                <div className="opt-row">
                  {colors.map(([name, hex]) => {
                    const match = variants.find(
                      (v) => v.color === name && v.storage === selected.storage,
                    );
                    const unavailable = match?.stockStatus === 'SOLD_OUT';
                    return (
                      <button
                        key={name}
                        className="swatch"
                        data-on={selected.color === name}
                        onClick={() => pickColor(name)}
                        title={unavailable ? `${name} — sold out in this size` : name}
                      >
                        <span
                          className="swatch-dot"
                          style={{ background: hex ?? 'rgba(255,255,255,.3)' }}
                        />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <WhatsAppButton
                productId={product.id}
                variantId={selected.id}
                fallbackUrl={whatsappLinks[selected.id] ?? '#'}
                source="product_page"
                disabled={soldOut}
                label={`Ask about this ${selected.storage ?? ''}`.trim()}
                className="btn btn-wa btn-block"
              />
              <p className="faint tiny" style={{ margin: 0, textAlign: 'center' }}>
                {soldOut
                  ? 'Message us and we will tell you when it lands.'
                  : 'Opens WhatsApp with this exact model and price filled in.'}
              </p>
            </div>

            {product.warrantyType && (
              <div
                className="row"
                style={{
                  gap: 10, marginTop: 22, paddingTop: 18,
                  borderTop: '1px solid rgba(255,255,255,.07)',
                }}
              >
                <ShieldIcon />
                <span className="tiny">{product.warrantyType}</span>
              </div>
            )}
          </div>

          {product.description && (
            <div className="glass" style={{ padding: 22, marginTop: 16 }}>
              <p className="eyebrow">About this phone</p>
              <p className="muted" style={{ margin: 0, fontSize: '0.92rem' }}>{product.description}</p>
            </div>
          )}

          {eligible.length > 0 && (
            <div className="glass" style={{ padding: 22, marginTop: 16 }}>
              <p className="eyebrow">Bank instalments</p>
              {eligible.map((p) => {
                const total = price * (1 + p.interestPct / 100);
                return (
                  <div key={p.id} className="emi-row">
                    <div>
                      <div style={{ fontSize: '0.9rem' }}>{p.bankName}</div>
                      <div className="faint tiny">
                        {p.months} months{p.interestPct === 0 ? ' · 0%' : ` · ${p.interestPct}%`}
                      </div>
                    </div>
                    <span className="price">{formatLKR(Math.round(total / p.months))}<span className="faint tiny">/mo</span></span>
                  </div>
                );
              })}
              <p className="faint tiny" style={{ margin: '12px 0 0' }}>
                Indicative only. Card and bank approval apply — we will confirm on WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---------- signature: floating action bar (mobile) ---------- */}
      <div className="actionbar glass">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="price" style={{ fontSize: '1.05rem' }}>{formatLKR(price)}</div>
          <div className="faint tiny" style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {variantLabel(selected)}
          </div>
        </div>
        <WhatsAppButton
          productId={product.id}
          variantId={selected.id}
          fallbackUrl={whatsappLinks[selected.id] ?? '#'}
          source="floating"
          disabled={soldOut}
          label="WhatsApp"
          className="btn btn-wa"
        />
      </div>
    </>
  );
}
