import { db } from '@/lib/supabase';
import { created, route } from '@/lib/response';
import { NotFound } from '@/lib/errors';
import { leadSchema, parseJson } from '@/lib/validation';
import { limitByIp } from '@/lib/ratelimit';
import { getSession } from '@/lib/auth';
import { variantLabel, effectivePrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leads
 * The "request a callback" form. Works for guests and logged-in users.
 * Guests get userId null; if they register later with the same phone,
 * the registration route backfills it.
 */
export const POST = route(async (req: Request) => {
  // Tighter than inquiries: this writes personal data.
  limitByIp(req, 'leads', 5, 60_000);

  const body = await parseJson(req, leadSchema);

  // Honeypot filled = bot. Return success so it does not learn anything.
  if (body.website) {
    return created({ id: 'ok', status: 'NEW' });
  }

  const { data: variant, error } = await db
    .from('ProductVariant')
    .select(`
      id, storage, ram, color, price, salePrice,
      product:Product!ProductVariant_productId_fkey ( id, name, isActive )
    `)
    .eq('id', body.variantId)
    .eq('productId', body.productId)
    .maybeSingle();

  if (error) throw error;

  const product = variant?.product as unknown as
    | { id: string; name: string; isActive: boolean }
    | undefined;

  if (!variant || !product?.isActive) throw NotFound('Product not found');

  // Attach to the account when logged in; otherwise try to match an
  // existing customer by their canonical phone number.
  const session = await getSession(req);
  let userId: string | null = session?.userId ?? null;

  if (!userId) {
    const { data: match } = await db
      .from('User')
      .select('id')
      .eq('phoneE164', body.phone.e164)
      .maybeSingle();
    userId = match?.id ?? null;
  }

  const { data: lead, error: insertError } = await db
    .from('Lead')
    .insert({
      userId,
      name: body.name ?? null,
      phone: body.phone.raw,
      phoneE164: body.phone.e164,
      email: body.email ?? null,
      city: body.city ?? null,
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantLabel: variantLabel(variant),
      price: effectivePrice({
        price: Number(variant.price),
        salePrice: variant.salePrice === null ? null : Number(variant.salePrice),
      }),
      message: body.message ?? null,
      status: 'NEW',
      consentedAt: new Date().toISOString(),
    })
    .select('id, status, createdAt')
    .single();

  if (insertError) throw insertError;

  return created({
    id: lead.id,
    status: lead.status,
    message: 'Thanks — we will call you back shortly.',
  });
});
