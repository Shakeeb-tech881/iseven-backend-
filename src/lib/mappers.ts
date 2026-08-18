import type {
  Badge, Banner, Brand, Category, Condition, InstallmentPlan,
  Product, ProductCard, ProductImage, ProductVariant, StockStatus,
} from './types';

/**
 * Postgres NUMERIC comes back from PostgREST as a string to avoid float
 * precision loss. The contract says prices are numbers, so every price
 * goes through here. This is the single most common source of
 * "why is my price 289900.00 instead of 289900" bugs.
 */
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : num(v);

/* eslint-disable @typescript-eslint/no-explicit-any */

export const mapBrand = (r: any): Brand => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  logo: r.logo ?? null,
  tagline: r.tagline ?? null,
});

export const mapCategory = (r: any): Category => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  icon: r.icon ?? null,
});

export const mapVariant = (r: any): ProductVariant => ({
  id: r.id,
  sku: r.sku ?? null,
  storage: r.storage ?? null,
  ram: r.ram ?? null,
  color: r.color ?? null,
  colorHex: r.colorHex ?? null,
  price: num(r.price),
  salePrice: numOrNull(r.salePrice),
  stockStatus: r.stockStatus as StockStatus,
  sortOrder: r.sortOrder ?? 0,
});

export const mapImage = (r: any): ProductImage => ({
  id: r.id,
  url: r.url,
  alt: r.alt ?? null,
  variantId: r.variantId ?? null,
  sortOrder: r.sortOrder ?? 0,
});

export const mapProductCard = (r: any): ProductCard => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  shortDesc: r.shortDesc ?? null,
  brandName: r.brandName,
  brandSlug: r.brandSlug,
  categorySlug: r.categorySlug,
  condition: r.condition as Condition,
  badge: (r.badge ?? null) as Badge | null,
  fromPrice: num(r.fromPrice),
  fromOriginalPrice: num(r.fromOriginalPrice),
  hasDiscount: Boolean(r.hasDiscount),
  anyInStock: Boolean(r.anyInStock),
  variantCount: Number(r.variantCount ?? 0),
  primaryImage: r.primaryImage ?? null,
  isFeatured: Boolean(r.isFeatured),
});

export const mapProduct = (r: any): Product => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  shortDesc: r.shortDesc ?? null,
  description: r.description ?? null,
  brand: mapBrand(r.brand),
  category: mapCategory(r.category),
  condition: r.condition as Condition,
  warrantyType: r.warrantyType ?? null,
  badge: (r.badge ?? null) as Badge | null,
  specs: (r.specs ?? null) as Record<string, string> | null,
  images: (r.images ?? [])
    .map(mapImage)
    .sort((a: ProductImage, b: ProductImage) => a.sortOrder - b.sortOrder),
  variants: (r.variants ?? [])
    .map(mapVariant)
    .sort((a: ProductVariant, b: ProductVariant) => a.sortOrder - b.sortOrder),
  metaTitle: r.metaTitle ?? null,
  metaDesc: r.metaDesc ?? null,
});

export const mapBanner = (r: any): Banner => ({
  id: r.id,
  categoryId: r.categoryId ?? null,
  title: r.title,
  subtitle: r.subtitle ?? null,
  cta: r.cta ?? null,
  image: r.image,
  link: r.link ?? null,
});

export const mapPlan = (r: any): InstallmentPlan => ({
  id: r.id,
  bankName: r.bankName,
  logo: r.logo ?? null,
  months: Number(r.months),
  interestPct: num(r.interestPct),
  minAmount: num(r.minAmount),
});
