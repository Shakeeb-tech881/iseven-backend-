import { env } from './env';
import { formatLKR, effectivePrice, variantLabel } from './format';
import type { ProductVariant } from './types';

/**
 * Built server-side so the message stays identical everywhere it appears.
 * The frontend calls this shape too — keep both in sync.
 */
export function whatsappUrl(opts: {
  productName: string;
  productSlug: string;
  variant: Pick<ProductVariant, 'storage' | 'ram' | 'color' | 'price' | 'salePrice'>;
}): string {
  const lines = [
    `Hi iSeven, I'm interested in:`,
    ``,
    `${opts.productName} — ${variantLabel(opts.variant)}`,
    formatLKR(effectivePrice(opts.variant)),
    ``,
    `${env.NEXT_PUBLIC_SITE_URL}/product/${opts.productSlug}`,
  ];
  return `https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}
