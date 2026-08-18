import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap section" style={{ minHeight: '58vh', display: 'grid', placeItems: 'center' }}>
      <div className="glass" style={{ padding: 'clamp(32px, 7vw, 56px)', textAlign: 'center', maxWidth: 520 }}>
        <p className="eyebrow">404</p>
        <h1 className="display h2" style={{ marginBottom: 12 }}>That page has moved on</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          The phone you were looking for may have sold out and been delisted.
          The shop page has everything currently in stock.
        </p>
        <Link href="/products" className="btn">Browse the shop</Link>
      </div>
    </section>
  );
}
