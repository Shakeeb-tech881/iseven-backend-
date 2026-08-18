import type { ProductVariant } from './types';

/**
 * Shared with the frontend. The WhatsApp message is built from these,
 * so keep this file identical on both sides or the message will drift.
 */

export const formatLKR = (n: number): string =>
  'Rs. ' + n.toLocaleString('en-LK', { maximumFractionDigits: 0 });

export const effectivePrice = (v: Pick<ProductVariant, 'price' | 'salePrice'>): number =>
  v.salePrice ?? v.price;

export const discountPct = (v: Pick<ProductVariant, 'price' | 'salePrice'>): number | null =>
  v.salePrice ? Math.round(((v.price - v.salePrice) / v.price) * 100) : null;

export const variantLabel = (
  v: Pick<ProductVariant, 'storage' | 'ram' | 'color'>,
): string => [v.storage, v.ram, v.color].filter(Boolean).join(' / ') || 'Standard';

/** URL-safe slug. Used when the admin leaves the slug field blank. */
export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/**
 * Next.js refuses to optimise remote SVG (it can carry scripts), and
 * placehold.co serves SVG — so every seeded placeholder throws at render
 * time. Rather than weakening image security for fake data, treat those
 * URLs as "no image" and let the normal empty state handle it.
 */
export function isUsableImage(url: string | null | undefined): url is string {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.svg')) return false;
  if (url.includes('placehold.co')) return false;
  return true;
}
