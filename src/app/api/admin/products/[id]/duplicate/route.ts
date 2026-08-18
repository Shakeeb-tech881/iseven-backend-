import { db } from '@/lib/supabase';
import { created, route, type RouteCtx } from '@/lib/response';
import { NotFound } from '@/lib/errors';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Copy a product with all its variants and images.
 *
 * Phone shops list the same model repeatedly with small differences —
 * new versus pre-owned, or a second colour run. Retyping eight variants
 * is where mistakes get made.
 *
 * The copy starts hidden so a half-finished duplicate never appears in
 * the shop.
 */
export const POST = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;

  const { data: src, error } = await db
    .from('Product')
    .select(`*, variants:ProductVariant(*), images:ProductImage(*)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!src) throw NotFound('Product not found');

  const suffix = Date.now().toString(36).slice(-4);

  const { data: copy, error: insertError } = await db
    .from('Product')
    .insert({
      name: `${src.name} (copy)`,
      slug: `${src.slug}-copy-${suffix}`,
      brandId: src.brandId,
      categoryId: src.categoryId,
      shortDesc: src.shortDesc,
      description: src.description,
      condition: src.condition,
      warrantyType: src.warrantyType,
      badge: src.badge,
      specs: src.specs,
      isFeatured: false,
      isActive: false,
      popularity: 0,
    })
    .select('id, slug')
    .single();
  if (insertError) throw insertError;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const variants = (src.variants ?? []) as any[];
  const oldToNew = new Map<string, string>();

  if (variants.length) {
    const { data: newVariants, error: vError } = await db
      .from('ProductVariant')
      .insert(variants.map((v) => ({
        productId: copy.id,
        sku: v.sku ? `${v.sku}-${suffix}` : null,   // SKU is unique
        storage: v.storage, ram: v.ram, color: v.color, colorHex: v.colorHex,
        price: v.price, salePrice: v.salePrice,
        stockStatus: v.stockStatus, sortOrder: v.sortOrder,
      })))
      .select('id, storage, ram, color');
    if (vError) {
      await db.from('Product').delete().eq('id', copy.id);
      throw vError;
    }

    // Re-point each image at the copy's matching variant, so colour
    // linking survives duplication instead of silently breaking.
    for (const old of variants) {
      const match = (newVariants ?? []).find(
        (n) => n.storage === old.storage && n.ram === old.ram && n.color === old.color,
      );
      if (match) oldToNew.set(old.id, match.id);
    }
  }

  const images = (src.images ?? []) as any[];
  if (images.length) {
    const { error: iError } = await db.from('ProductImage').insert(
      images.map((img) => ({
        productId: copy.id,
        variantId: img.variantId ? oldToNew.get(img.variantId) ?? null : null,
        url: img.url, alt: img.alt, sortOrder: img.sortOrder,
      })),
    );
    if (iError) {
      await db.from('Product').delete().eq('id', copy.id);
      throw iError;
    }
  }

  return created({ id: copy.id, slug: copy.slug });
});
