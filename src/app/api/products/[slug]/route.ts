import { db } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { NotFound } from '@/lib/errors';
import { mapProduct } from '@/lib/mappers';
import { whatsappUrl } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/** GET /api/products/samsung-galaxy-s24-ultra-5g */
export const GET = route(async (_req: Request, ctx: RouteCtx<{ slug: string }>) => {
  const { slug } = await ctx.params;
  const { data, error } = await db
    .from('Product')
    .select(`
      id, slug, name, shortDesc, description, condition, warrantyType,
      badge, specs, metaTitle, metaDesc, isActive,
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
  if (!data) throw NotFound('Product not found');

  // Hide deactivated variants without hiding the product itself.
  const row = {
    ...data,
    variants: (data.variants ?? []).filter((v: { isActive: boolean }) => v.isActive),
  };

  if (row.variants.length === 0) throw NotFound('Product is not available');

  const product = mapProduct(row);

  // Pre-built links save the frontend from rebuilding the message per variant.
  const whatsappLinks = Object.fromEntries(
    product.variants.map((v) => [
      v.id,
      whatsappUrl({ productName: product.name, productSlug: product.slug, variant: v }),
    ]),
  );

  return ok({ ...product, whatsappLinks });
});
