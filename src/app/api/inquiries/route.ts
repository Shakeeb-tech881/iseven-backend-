import { db } from '@/lib/supabase';
import { created, route } from '@/lib/response';
import { NotFound } from '@/lib/errors';
import { inquirySchema, parseJson } from '@/lib/validation';
import { limitByIp } from '@/lib/ratelimit';
import { variantLabel, effectivePrice } from '@/lib/format';
import { whatsappUrl } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inquiries
 * Fired on every WhatsApp button click, before the redirect.
 * With no orders in the system this table is the only demand data
 * you will ever have, so it matters that it is accurate.
 *
 * Name, label and price are denormalised on purpose: the record must
 * still make sense after a discontinued phone is deleted.
 */
export const POST = route(async (req: Request) => {
  limitByIp(req, 'inquiries', 30, 60_000);

  const body = await parseJson(req, inquirySchema);

  // Price is read from the database, never trusted from the client —
  // otherwise anyone can poison your analytics with fake figures.
  const { data: variant, error } = await db
    .from('ProductVariant')
    .select(`
      id, storage, ram, color, price, salePrice,
      product:Product!ProductVariant_productId_fkey ( id, name, slug, isActive )
    `)
    .eq('id', body.variantId)
    .eq('productId', body.productId)
    .maybeSingle();

  if (error) throw error;

  const product = variant?.product as unknown as
    | { id: string; name: string; slug: string; isActive: boolean }
    | undefined;

  if (!variant || !product?.isActive) throw NotFound('Product not found');

  const price = effectivePrice({
    price: Number(variant.price),
    salePrice: variant.salePrice === null ? null : Number(variant.salePrice),
  });

  const { error: insertError } = await db.from('Inquiry').insert({
    productId: product.id,
    variantId: variant.id,
    productName: product.name,
    variantLabel: variantLabel(variant),
    price,
    source: body.source,
  });

  // Logging must never block the customer reaching WhatsApp.
  if (insertError) console.error('[inquiry] insert failed', insertError);

  return created({
    logged: !insertError,
    whatsappUrl: whatsappUrl({
      productName: product.name,
      productSlug: product.slug,
      variant: {
        storage: variant.storage,
        ram: variant.ram,
        color: variant.color,
        price: Number(variant.price),
        salePrice: variant.salePrice === null ? null : Number(variant.salePrice),
      },
    }),
  });
});
