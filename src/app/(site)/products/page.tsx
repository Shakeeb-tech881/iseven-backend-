import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getBanners, getBrandBySlug, getBrands, getCategoryBySlug, getProducts, safe } from '@/lib/data';
import ProductTile from '@/components/ProductTile';
import Filters from '@/components/Filters';
import BannerSlider from '@/components/BannerSlider';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const brandSlug = one(sp.brand);
  const categorySlug = one(sp.category);

  // Any of these narrows a view that's a duplicate of one already
  // canonicalised elsewhere (or of the plain /products page), so it gets
  // pointed back rather than left to compete with the page it duplicates.
  const isNoiseView = [sp.sort, sp.page, sp.search, sp.inStock, sp.condition].some(
    (v) => one(v) != null && one(v) !== '',
  );

  if (brandSlug) {
    const brand = await safe(() => getBrandBySlug(brandSlug), null, 'metadata brand');
    if (brand) {
      const canonical = `/products?brand=${brand.slug}`;
      return {
        title: `${brand.name} Phones in Sri Lanka`,
        description: `${brand.name} phones in stock at iSeven Mobiles, with live prices — message us on WhatsApp for the real price.`,
        alternates: { canonical: isNoiseView ? '/products' : canonical },
        robots: isNoiseView ? { index: false, follow: true } : undefined,
      };
    }
  }

  if (categorySlug) {
    const category = await safe(() => getCategoryBySlug(categorySlug), null, 'metadata category');
    if (category) {
      const canonical = `/products?category=${category.slug}`;
      return {
        title: `${category.name} in Sri Lanka`,
        description: `${category.name} in stock at iSeven Mobiles, with live prices — message us on WhatsApp for the real price.`,
        alternates: { canonical: isNoiseView ? '/products' : canonical },
        robots: isNoiseView ? { index: false, follow: true } : undefined,
      };
    }
  }

  return {
    title: 'All Products',
    description: 'Every phone and accessory currently at iSeven Mobiles, with live prices and island-wide delivery across Sri Lanka.',
    alternates: { canonical: '/products' },
    robots: isNoiseView ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const query = {
    brand: one(sp.brand),
    category: one(sp.category),
    condition: one(sp.condition),
    inStock: one(sp.inStock) === 'true',
    search: one(sp.search),
    sort: one(sp.sort),
    page: Number(one(sp.page)) || 1,
    limit: 12,
  };

  const [{ products, total, page, totalPages }, brands, categoryBanners, brandInfo, categoryInfo] =
    await Promise.all([
      getProducts(query),
      getBrands(),
      // Category banners run as a slideshow above the grid, the same way
      // the homepage set does.
      safe(() => (query.category ? getBanners(query.category) : Promise.resolve([])), [], 'category banners'),
      safe(() => (query.brand ? getBrandBySlug(query.brand) : Promise.resolve(null)), null, 'brand'),
      safe(() => (query.category ? getCategoryBySlug(query.category) : Promise.resolve(null)), null, 'category'),
    ]);

  const pageLink = (n: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const s = one(v);
      if (s) next.set(k, s);
    }
    next.set('page', String(n));
    return `/products?${next.toString()}`;
  };

  const heading = brandInfo?.name ?? categoryInfo?.name ?? 'Everything in stock';

  return (
    <>
      {categoryBanners.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <BannerSlider banners={categoryBanners} />
        </div>
      )}

      <section className="wrap section-tight">
        {/* Brand art, uploaded under Brands in the admin. */}
        {brandInfo?.banner && (
          <div className="pagehead">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandInfo.banner} alt={brandInfo.name} />
            <div className="pagehead-copy">
              <div>
                <h1 className="display h2">{brandInfo.name}</h1>
                {brandInfo.tagline && (
                  <p className="muted tiny" style={{ margin: '6px 0 0' }}>{brandInfo.tagline}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!brandInfo?.banner && (
          <>
            <p className="eyebrow">The shop</p>
            <h1 className="display h2" style={{ marginBottom: 20 }}>{heading}</h1>
          </>
        )}

      <Suspense fallback={<div className="skeleton" style={{ height: 160 }} />}>
        <Filters brands={brands} />
      </Suspense>

      <p className="faint tiny" style={{ margin: '18px 0 16px' }}>
        {total === 0 ? 'No matches' : `${total} ${total === 1 ? 'product' : 'products'}`}
      </p>

      {products.length === 0 ? (
        <div className="glass empty">
          <h2 className="display h3" style={{ marginBottom: 10 }}>Nothing matches that yet</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            Try removing a filter, or message us — we can often source a model that is not listed.
          </p>
          <Link href="/products" className="btn">Show everything</Link>
        </div>
      ) : (
        <div className="grid-products">
          {products.map((p) => <ProductTile key={p.id} p={p} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pager" aria-label="Pagination">
          {page > 1 && <Link href={pageLink(page - 1)} className="btn btn-sm">Previous</Link>}
          <span className="btn btn-sm" style={{ pointerEvents: 'none' }}>
            <span className="price">{page}</span>
            <span className="faint">of {totalPages}</span>
          </span>
          {page < totalPages && <Link href={pageLink(page + 1)} className="btn btn-sm">Next</Link>}
          </nav>
        )}
      </section>
    </>
  );
}
