import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNavLinks, getShop, safe, SHOP_FALLBACK } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Shell for the public shop. Admin has its own. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [links, shop] = await Promise.all([
    safe(() => getNavLinks(), [{ href: '/', label: 'Home' }, { href: '/products', label: 'Shop' }], 'nav links'),
    safe(() => getShop(), SHOP_FALLBACK, 'shop settings'),
  ]);

  return (
    <>
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
