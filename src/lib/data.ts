import 'server-only';
import { db } from './supabase';
import { mapBanner, mapBrand, mapCategory, mapPlan, mapProduct, mapProductCard } from './mappers';
import type { Banner, Brand, Category, InstallmentPlan, Product, ProductCard } from './types';
import { isUsableImage } from './format';

/**
 * Server-side reads for the site's own pages.
 *
 * These query Postgres directly rather than fetching our own /api routes.
 * A server component calling its own HTTP endpoint adds a network hop and
 * a second serialisation for no benefit. The /api routes stay exactly as
 * they are for external clients.
 */

/**
 * Never let one failed section take down a whole page.
 *
 * The free Supabase tier pauses after a week of inactivity, and a build
 * or a request landing in that window would otherwise 500 the entire
 * homepage. A missing rail is a far better failure than a missing site.
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[data] ${label} failed:`, err);
    return fallback;
  }
}

export interface CatalogueQuery {
  brand?: string;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function getProducts(q: CatalogueQuery = {}): Promise<{
  products: ProductCard[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(48, q.limit ?? 12);

  // In-stock first, always. PostgREST applies .order() in chain order,
  // so this has to come before the sort below.
  let query = db
    .from('ProductCard')
    .select('*', { count: 'exact' })
    .order('anyInStock', { ascending: false });

  if (q.brand) query = query.eq('brandSlug', q.brand);
  if (q.category) query = query.eq('categorySlug', q.category);
  if (q.condition) query = query.eq('condition', q.condition);
  if (q.minPrice !== undefined) query = query.gte('fromPrice', q.minPrice);
  if (q.maxPrice !== undefined) query = query.lte('fromPrice', q.maxPrice);
  if (q.inStock) query = query.eq('anyInStock', true);
  if (q.featured) query = query.eq('isFeatured', true);
  if (q.search) {
    const term = q.search.replace(/[%,()]/g, ' ').trim();
    if (term) query = query.or(`name.ilike.%${term}%,brandName.ilike.%${term}%`);
  }

  switch (q.sort) {
    case 'newest': query = query.order('createdAt', { ascending: false }); break;
    case 'price_asc': query = query.order('fromPrice', { ascending: true }); break;
    case 'price_desc': query = query.order('fromPrice', { ascending: false }); break;
    case 'name_asc': query = query.order('name', { ascending: true }); break;
    default:
      query = query.order('popularity', { ascending: false }).order('createdAt', { ascending: false });
  }

  const from = (page - 1) * limit;
  const { data, error, count } = await query.range(from, from + limit - 1);
  if (error) throw error;

  const total = count ?? 0;
  return {
    products: (data ?? []).map(mapProductCard).map((p) => ({
      ...p,
      primaryImage: isUsableImage(p.primaryImage) ? p.primaryImage : null,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await db
    .from('Product')
    .select(`
      id, slug, name, shortDesc, description, condition, warrantyType,
      badge, specs, metaTitle, metaDesc,
      brand:Brand!Product_brandId_fkey ( id, name, slug, logo, tagline ),
      category:Category!Product_categoryId_fkey ( id, name, slug, icon ),
      variants:ProductVariant ( id, sku, storage, ram, color, colorHex,
                                price, salePrice, stockStatus, sortOrder, isActive ),
      images:ProductImage ( id, url, alt, variantId, sortOrder )
    `)
    .eq('slug', slug)
    .eq('isActive', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const variants = (data.variants ?? []).filter((v: { isActive: boolean }) => v.isActive);
  if (variants.length === 0) return null;

  const product = mapProduct({ ...data, variants });
  product.images = product.images.filter((i) => isUsableImage(i.url));
  return product;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const { data, error } = await db.from('Product').select('slug').eq('isActive', true);
  if (error) throw error;
  return (data ?? []).map((r) => r.slug as string);
}

export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await db
    .from('Brand').select('id, name, slug, logo, tagline')
    .eq('isActive', true).order('sortOrder', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapBrand);
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db
    .from('Category').select('id, name, slug, icon')
    .eq('isActive', true).order('sortOrder', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

/**
 * Banners for one surface.
 *
 * `categorySlug` null returns the homepage set; a slug returns that
 * category's own. Several rows for the same target become a slideshow.
 */
export async function getBanners(categorySlug?: string | null): Promise<Banner[]> {
  const now = new Date().toISOString();

  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: cat } = await db
      .from('Category').select('id').eq('slug', categorySlug).maybeSingle();
    if (!cat) return [];
    categoryId = cat.id;
  }

  let query = db
    .from('Banner').select('id, categoryId, title, subtitle, cta, image, link')
    .eq('isActive', true)
    .or(`startsAt.is.null,startsAt.lte.${now}`)
    .or(`endsAt.is.null,endsAt.gte.${now}`)
    .order('sortOrder', { ascending: true });

  query = categoryId ? query.eq('categoryId', categoryId) : query.is('categoryId', null);

  const { data, error } = await query;
  if (error) throw error;

  // A banner is nothing but its image, so drop any with an unusable one.
  return (data ?? []).map(mapBanner).filter((b) => isUsableImage(b.image));
}

/** Brand header art for the brand listing page. */
export async function getBrandBySlug(slug: string): Promise<(Brand & { banner: string | null }) | null> {
  const { data, error } = await db
    .from('Brand').select('id, name, slug, logo, tagline, banner')
    .eq('slug', slug).eq('isActive', true).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...mapBrand(data),
    banner: isUsableImage(data.banner) ? data.banner : null,
  };
}

/** Category header, for the category listing page. */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await db
    .from('Category').select('id, name, slug, icon')
    .eq('slug', slug).eq('isActive', true).maybeSingle();
  if (error) throw error;
  return data ? mapCategory(data) : null;
}

export async function getInstallmentPlans(): Promise<InstallmentPlan[]> {
  const { data, error } = await db
    .from('InstallmentPlan').select('id, bankName, logo, months, interestPct, minAmount')
    .eq('isActive', true).order('sortOrder', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPlan);
}

export interface HeroSetting {
  mode: 'featured' | 'custom';
  image: string | null;
  spotlightProductId: string | null;
  spotlightLabel: string | null;
  blur: number;
  dim: number;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  primaryLabel: string | null;
  primaryHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  statsEnabled: boolean;
  stat1Value: string | null; stat1Label: string | null;
  stat2Value: string | null; stat2Label: string | null;
  stat3Value: string | null; stat3Label: string | null;
}

export const HERO_FALLBACK: HeroSetting = {
  mode: 'featured',
  image: null,
  spotlightProductId: null,
  spotlightLabel: 'Most asked about',
  blur: 30,
  dim: 45,
  eyebrow: 'Colombo · Since 2016',
  title: 'Real phones.\nReal prices.\nOne message away.',
  subtitle:
    'Every phone here is in the shop, warranty-backed, and priced as listed. Pick a model and message us.',
  primaryLabel: 'Browse the stock',
  primaryHref: '/products',
  secondaryLabel: 'Pre-owned',
  secondaryHref: '/products?condition=USED',
  statsEnabled: false,
  stat1Value: null, stat1Label: null,
  stat2Value: null, stat2Label: null,
  stat3Value: null, stat3Label: null,
};

/** Hero configuration, editable at /admin/hero. */
export async function getHero(): Promise<HeroSetting> {
  const { data, error } = await db
    .from('Setting').select('value').eq('key', 'hero').maybeSingle();
  if (error) throw error;
  const hero = { ...HERO_FALLBACK, ...((data?.value ?? {}) as Partial<HeroSetting>) };
  if (!isUsableImage(hero.image)) hero.image = null;
  return hero;
}

/**
 * The one product shown in the hero card.
 *
 * An explicit pick wins. Falling back to "highest popularity among
 * featured" is fine as a default but was invisible from the admin — you
 * could not tell why a particular phone was there.
 */
export async function getSpotlight(productId: string | null): Promise<ProductCard | null> {
  if (productId) {
    const { data, error } = await db
      .from('ProductCard').select('*').eq('id', productId).maybeSingle();
    if (error) throw error;
    if (data) return mapProductCard(data);
    // Chosen product was hidden or deleted — fall through rather than
    // leaving a hole in the homepage.
  }

  const { products } = await getProducts({ featured: true, limit: 1 });
  if (products.length) return products[0];

  const { products: latest } = await getProducts({ sort: 'newest', limit: 1 });
  return latest[0] ?? null;
}

export interface ShopSetting {
  name: string;
  whatsapp: string;
  email: string | null;
  addressLine: string | null;
  mapUrl: string | null;
  hours: string | null;
  footerBlurb: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
}

export interface NavSetting {
  showCategories: boolean;
  maxCategories: number;
  shopLabel: string;
  extra: { label: string; href: string }[];
}

export const SHOP_FALLBACK: ShopSetting = {
  name: 'iSeven Mobile Private Limited',
  whatsapp: '94777655565',
  email: null,
  addressLine: 'Colombo, Sri Lanka',
  mapUrl: null,
  hours: null,
  footerBlurb: null,
  facebook: null, instagram: null, tiktok: null,
};

export const NAV_FALLBACK: NavSetting = {
  showCategories: true,
  maxCategories: 4,
  shopLabel: 'All Products',
  extra: [{ label: 'Contact', href: '/contact' }],
};

async function setting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await db
    .from('Setting').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return { ...fallback, ...((data?.value ?? {}) as Partial<T>) };
}

export const getShop = () => setting<ShopSetting>('shop', SHOP_FALLBACK);
export const getNav = () => setting<NavSetting>('nav', NAV_FALLBACK);

/**
 * Header links, built from live categories.
 *
 * Hardcoding the menu meant adding a category left it invisible to
 * customers until someone edited the code. Now the shop's own structure
 * drives the navigation.
 */
export async function getNavLinks(): Promise<{ href: string; label: string }[]> {
  const [nav, categories] = await Promise.all([
    safe(() => getNav(), NAV_FALLBACK, 'nav'),
    safe(() => getCategories(), [], 'nav categories'),
  ]);

  const links = [{ href: '/', label: 'Home' }];

  // The catalogue link is always present. With only category links a customer
  // could browse Smartphones or Tablets but never reach the full
  // catalogue, and anything in a category beyond maxCategories became
  // unreachable from the menu entirely.
  links.push({ href: '/products', label: nav.shopLabel || 'All Products' });

  if (nav.showCategories) {
    for (const c of categories.slice(0, nav.maxCategories)) {
      links.push({ href: `/products?category=${c.slug}`, label: c.name });
    }
  }

  for (const e of nav.extra) links.push({ href: e.href, label: e.label });

  return links;
}

/** Brand list with a live count, for the "browse by brand" grid. */
export async function getBrandsWithCounts(): Promise<Array<Brand & { count: number }>> {
  const [brands, { data: rows, error }] = await Promise.all([
    getBrands(),
    db.from('ProductCard').select('brandSlug'),
  ]);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    const slug = (r as { brandSlug: string }).brandSlug;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return brands
    .map((b) => ({ ...b, count: counts.get(b.slug) ?? 0 }))
    .filter((b) => b.count > 0);
}
