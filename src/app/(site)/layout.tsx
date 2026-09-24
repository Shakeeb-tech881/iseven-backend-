import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNavLinks, getShop, safe, SHOP_FALLBACK } from '@/lib/data';
import { env } from '@/lib/env';

// The nav and shop settings this shell fetches change rarely (an admin
// edits them, not a customer), so a 5-minute cache is plenty and spares
// every page render the DB round trip force-dynamic used to force. The
// homepage keeps its own force-dynamic for the stock it shows below this
// shell.
export const revalidate = 300;

/** Shell for the public shop. Admin has its own. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [links, shop] = await Promise.all([
    safe(() => getNavLinks(), [{ href: '/', label: 'Home' }, { href: '/products', label: 'Shop' }], 'nav links'),
    safe(() => getShop(), SHOP_FALLBACK, 'shop settings'),
  ]);

  // Store details for search engines, sourced from Settings rather than
  // hardcoded, so /admin/settings stays the one place the shop's public
  // details live.
  const storeLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    url: env.NEXT_PUBLIC_SITE_URL,
    telephone: shop.whatsapp ? `+${shop.whatsapp}` : undefined,
    email: shop.email ?? undefined,
    address: shop.addressLine ?? undefined,
    hasMap: shop.mapUrl ?? undefined,
    openingHours: shop.hours ?? undefined,
    sameAs: [shop.facebook, shop.instagram, shop.tiktok].filter(
      (v): v is string => Boolean(v),
    ),
    currenciesAccepted: 'LKR',
    areaServed: 'Sri Lanka',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeLd) }}
      />
      {/* Header reads the query string to mark the current link, which
          Next requires be wrapped in Suspense. */}
      <Suspense fallback={<div className="masthead" style={{ height: 63 }} />}>
        <Header whatsappNumber={shop.whatsapp} links={links} shopName={shop.name} />
      </Suspense>
      <main>{children}</main>
      <Footer shop={shop} />
    </>
  );
}
