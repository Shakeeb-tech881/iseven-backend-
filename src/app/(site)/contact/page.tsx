import type { Metadata } from 'next';
import { getShop, safe, SHOP_FALLBACK } from '@/lib/data';
import { WhatsAppIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach iSeven Mobile in Colombo on WhatsApp for prices, stock and trade-ins.',
};

export default async function ContactPage() {
  const shop = await safe(() => getShop(), SHOP_FALLBACK, 'shop');
  const pretty = shop.whatsapp.replace(/^94/, '0').replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');

  return (
    <section className="wrap section">
      <p className="eyebrow">Talk to us</p>
      <h1 className="display h2" style={{ marginBottom: 16 }}>One message, a real answer</h1>
      <p className="lede" style={{ marginBottom: 34 }}>
        WhatsApp is the fastest way to reach the shop. Ask about price, stock, trade-in value,
        or whether a model is worth it — we will tell you straight.
      </p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
        <div className="glass" style={{ padding: 24 }}>
          <p className="eyebrow">WhatsApp</p>
          <p className="price" style={{ fontSize: '1.2rem', marginBottom: 16 }}>{pretty}</p>
          <a className="btn btn-wa" href={`https://wa.me/${shop.whatsapp}`} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={17} /> Start a chat
          </a>
        </div>

        <div className="glass" style={{ padding: 24 }} id="warranty">
          <p className="eyebrow">Warranty</p>
          <p className="muted tiny" style={{ margin: 0 }}>
            New phones carry agent warranty where the brand has a local agent; the exact terms are
            listed on each product page. Pre-owned units carry a shop warranty — the length is
            stated before you buy, never after.
          </p>
        </div>

        <div className="glass" style={{ padding: 24 }} id="delivery">
          <p className="eyebrow">Delivery</p>
          <p className="muted tiny" style={{ margin: 0 }}>
            Island-wide courier, usually next working day to Colombo and two to three days
            elsewhere. High-value handsets are sent insured. Cash on delivery is available for
            selected items — ask when you message.
          </p>
        </div>
      </div>
    </section>
  );
}
