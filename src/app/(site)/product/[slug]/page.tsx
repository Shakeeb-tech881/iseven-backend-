import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllProductSlugs, getInstallmentPlans, getProductBySlug, getProducts } from '@/lib/data';
import { whatsappUrl } from '@/lib/whatsapp';
import { effectivePrice } from '@/lib/format';
import { env } from '@/lib/env';
import ProductDetail from '@/components/ProductDetail';
import ProductTile from '@/components/ProductTile';
import CallbackForm from '@/components/CallbackForm';

export const revalidate = 60;

export async function generateStaticParams() {
  // Pre-render known products at build time, but never let a database
  // hiccup fail the whole build — a paused free-tier Supabase project or
  // a network blip would otherwise take the site down. Falling back to an
  // empty list just means every page renders on first request instead.
  try {
    const slugs = await getAllProductSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (err) {
    console.warn('[build] could not prerender product pages:', err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Not found' };

  const image = product.images[0]?.url;
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDesc ?? product.shortDesc ?? undefined,
    openGraph: {
      title: product.metaTitle ?? product.name,
      description: product.metaDesc ?? product.shortDesc ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [product, plans] = await Promise.all([getProductBySlug(slug), getInstallmentPlans()]);
  if (!product) notFound();

  const related = await getProducts({ brand: product.brand.slug, limit: 5 });

  // Built server-side so the message always carries the live price, and
  // so the button still works if the inquiry request fails.
  const whatsappLinks = Object.fromEntries(
    product.variants.map((v) => [
      v.id,
      whatsappUrl({ productName: product.name, productSlug: product.slug, variant: v }),
    ]),
  );

  const cheapest = Math.min(...product.variants.map(effectivePrice));
  const inStock = product.variants.some((v) => v.stockStatus === 'IN_STOCK');

  // Product schema so the price shows in Google results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.shortDesc ?? undefined,
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku ?? undefined,
    brand: { '@type': 'Brand', name: product.brand.name },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'LKR',
      lowPrice: cheapest,
      highPrice: Math.max(...product.variants.map(effectivePrice)),
      offerCount: product.variants.length,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${env.NEXT_PUBLIC_SITE_URL}/product/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="wrap" style={{ paddingTop: 22 }} aria-label="Breadcrumb">
        <p className="faint tiny" style={{ margin: 0 }}>
          <Link href="/products">Shop</Link>
          <span> / </span>
          <Link href={`/products?brand=${product.brand.slug}`}>{product.brand.name}</Link>
          <span> / {product.name}</span>
        </p>
      </nav>

      <ProductDetail product={product} plans={plans} whatsappLinks={whatsappLinks} />

      <section className="wrap section-tight">
        <div className="glass" style={{ padding: 24, maxWidth: 520 }}>
          <p className="eyebrow">Rather we called you?</p>
          <p className="muted tiny" style={{ marginTop: 0, marginBottom: 18 }}>
            Leave a number and we will ring you back about this model.
          </p>
          <CallbackForm
            productId={product.id}
            variantId={product.variants[0].id}
            productName={product.name}
          />
        </div>
      </section>

      {related.products.filter((p) => p.slug !== product.slug).length > 0 && (
        <section className="wrap section">
          <p className="eyebrow">More {product.brand.name}</p>
          <h2 className="display h3" style={{ marginBottom: 22 }}>Others in this range</h2>
          <div className="grid-products">
            {related.products
              .filter((p) => p.slug !== product.slug)
              .slice(0, 4)
              .map((p) => <ProductTile key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </>
  );
}
