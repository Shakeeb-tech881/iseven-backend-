import Image from 'next/image';
import Link from 'next/link';
import type { ShopSetting } from '@/lib/data';

export default function Footer({ shop }: { shop: ShopSetting }) {
  const pretty = shop.whatsapp.replace(/^94/, '0').replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  const socials = [
    ['Facebook', shop.facebook],
    ['Instagram', shop.instagram],
    ['TikTok', shop.tiktok],
  ].filter(([, url]) => Boolean(url)) as [string, string][];

  return (
    <footer className="foot">
      <div className="wrap foot-grid">
        <div className="foot-col">
          <div className="logo" style={{ marginBottom: 16 }}>
            <Image src="/logo.png" alt={shop.name} width={900} height={300} />
          </div>

          {shop.footerBlurb && (
            <p className="muted tiny" style={{ maxWidth: '38ch', margin: 0 }}>
              {shop.footerBlurb}
            </p>
          )}

          <a
            className="price"
            href={`https://wa.me/${shop.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 16, color: 'var(--acid)' }}
          >
            {pretty}
          </a>

          {shop.addressLine && (
            <p className="faint tiny" style={{ margin: '8px 0 0' }}>{shop.addressLine}</p>
          )}
          {shop.hours && <p className="faint tiny" style={{ margin: 0 }}>{shop.hours}</p>}

          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {socials.map(([label, url]) => (
                <a key={label} className="chip" href={url} target="_blank" rel="noopener noreferrer">
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="foot-col">
          <h4>Shop</h4>
          <Link href="/products">All products</Link>
          <Link href="/products?condition=NEW">Brand new</Link>
          <Link href="/products?condition=USED">Pre-owned</Link>
          <Link href="/products?inStock=true">In stock now</Link>
        </div>

        <div className="foot-col">
          <h4>Shop info</h4>
          <Link href="/contact">Contact</Link>
          <Link href="/contact#warranty">Warranty</Link>
          <Link href="/contact#delivery">Delivery</Link>
          {shop.mapUrl && (
            <a href={shop.mapUrl} target="_blank" rel="noopener noreferrer">Find us ↗</a>
          )}
        </div>
      </div>

      <div className="wrap" style={{ marginTop: 34 }}>
        <p className="faint tiny" style={{ margin: 0 }}>
          © {new Date().getFullYear()} {shop.name}. Prices in Sri Lankan rupees and subject
          to change — confirm on WhatsApp before travelling to the shop.
        </p>
      </div>
    </footer>
  );
}