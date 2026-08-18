import Image from 'next/image';
import Link from 'next/link';
import { formatLKR } from '@/lib/format';
import type { ProductCard } from '@/lib/types';

/**
 * Listing tile. Deliberately tolerant: a product may have no image, no
 * short description, one variant, or be entirely sold out.
 */
export default function ProductTile({ p }: { p: ProductCard }) {
  const off = p.hasDiscount
    ? Math.round(((p.fromOriginalPrice - p.fromPrice) / p.fromOriginalPrice) * 100)
    : 0;

  return (
    <Link href={`/product/${p.slug}`} className="glass glass-hover tile">
      <div className="tile-media" data-empty={p.primaryImage ? 'false' : 'true'}>
        {p.primaryImage ? (
          <Image
            src={p.primaryImage}
            alt={p.name}
            width={480}
            height={600}
            className={p.anyInStock ? undefined : 'dim-out'}
            sizes="(max-width: 640px) 50vw, 240px"
          />
        ) : (
          <span>Photo coming</span>
        )}

        <div className="tile-flags">
          {!p.anyInStock && <span className="badge badge-out">Sold out</span>}
          {off > 0 && p.anyInStock && <span className="badge badge-sale">−{off}%</span>}
          {p.condition === 'USED' && <span className="badge badge-used">Pre-owned</span>}
        </div>
      </div>

      <div className="tile-body">
        <span className="eyebrow" style={{ margin: 0 }}>{p.brandName}</span>
        <h3 className="tile-name">{p.name}</h3>
        {p.shortDesc && <p className="muted tiny" style={{ margin: 0 }}>{p.shortDesc}</p>}

        <div style={{ marginTop: 'auto', paddingTop: 10 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="price">{formatLKR(p.fromPrice)}</span>
            {p.hasDiscount && <span className="price-was">{formatLKR(p.fromOriginalPrice)}</span>}
          </div>
          <p className="faint tiny" style={{ margin: '4px 0 0' }}>
            {p.variantCount > 1 ? `From · ${p.variantCount} options` : 'One option'}
          </p>
        </div>
      </div>
    </Link>
  );
}
