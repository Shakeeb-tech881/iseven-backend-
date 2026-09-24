import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { getBrands, getCategories, getProductSitemapEntries, safe } from '@/lib/data';

// An hour is plenty for a catalogue that changes by the product, not by
// the minute, and keeps this off the DB on every crawler hit.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = env.NEXT_PUBLIC_SITE_URL;

  // Each call is wrapped in safe() so a paused Supabase project still
  // returns the static pages rather than 500ing the whole sitemap.
  const [brands, categories, products] = await Promise.all([
    safe(() => getBrands(), [], 'sitemap brands'),
    safe(() => getCategories(), [], 'sitemap categories'),
    safe(() => getProductSitemapEntries(), [], 'sitemap products'),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: site, changeFrequency: 'daily', priority: 1 },
    { url: `${site}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site}/contact`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const brandEntries: MetadataRoute.Sitemap = brands.map((b) => ({
    url: `${site}/products?brand=${b.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${site}/products?category=${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${site}/product/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticEntries, ...brandEntries, ...categoryEntries, ...productEntries];
}
