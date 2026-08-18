import { db, PG } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { Conflict, NotFound } from '@/lib/errors';
import { parseJson, productUpdateSchema } from '@/lib/validation';
import { z } from 'zod';
import { requireStaff, requireAdmin } from '@/lib/auth';
import { mapProduct } from '@/lib/mappers';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

const SELECT = `
  id, slug, name, shortDesc, description, condition, warrantyType,
  badge, specs, metaTitle, metaDesc, isActive, isFeatured, popularity,
  brand:Brand!Product_brandId_fkey ( id, name, slug, logo, tagline ),
  category:Category!Product_categoryId_fkey ( id, name, slug, icon ),
  variants:ProductVariant ( id, sku, storage, ram, color, colorHex,
                            price, salePrice, stockStatus, sortOrder ),
  images:ProductImage ( id, url, alt, variantId, sortOrder )
`;

/** GET /api/admin/products/:id */
export const GET = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;

  const { data, error } = await db
    .from('Product')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw NotFound('Product not found');

  return ok({ ...mapProduct(data), isActive: data.isActive, isFeatured: data.isFeatured });
});

/**
 * PUT /api/admin/products/:id
 * Variants sent with an id are updated, those without are created, and
 * any existing variant not in the payload is removed. Same for images.
 */
export const PUT = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);

  const { id } = await ctx.params;
  const body = await parseJson(req, productUpdateSchema);
  const slug = body.slug?.trim() || slugify(body.name);

  const { data: existing } = await db.from('Product').select('id').eq('id', id).maybeSingle();
  if (!existing) throw NotFound('Product not found');

  const { error } = await db
    .from('Product')
    .update({
      name: body.name,
      slug,
      brandId: body.brandId,
      categoryId: body.categoryId,
      shortDesc: body.shortDesc ?? null,
      description: body.description ?? null,
      condition: body.condition,
      warrantyType: body.warrantyType ?? null,
      badge: body.badge ?? null,
      specs: body.specs ?? null,
      isFeatured: body.isFeatured,
      isActive: body.isActive,
      popularity: body.popularity,
      metaTitle: body.metaTitle ?? null,
      metaDesc: body.metaDesc ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict(`The slug "${slug}" is already in use`);
    throw error;
  }

  // --- variants -------------------------------------------------------
  const keepVariantIds = body.variants.map((v) => v.id).filter(Boolean) as string[];

  if (keepVariantIds.length > 0) {
    await db
      .from('ProductVariant')
      .delete()
      .eq('productId', id)
      .not('id', 'in', `(${keepVariantIds.join(',')})`);
  } else {
    await db.from('ProductVariant').delete().eq('productId', id);
  }

  // Track the resulting variant ids in form order, so images can be
  // linked by position whether they are new or existing.
  const variantIds: string[] = [];

  for (const [i, v] of body.variants.entries()) {
    const row = {
      productId: id,
      sku: v.sku ?? null,
      storage: v.storage ?? null,
      ram: v.ram ?? null,
      color: v.color ?? null,
      colorHex: v.colorHex ?? null,
      price: v.price,
      salePrice: v.salePrice ?? null,
      stockStatus: v.stockStatus,
      sortOrder: v.sortOrder || i,
      updatedAt: new Date().toISOString(),
    };

    const { data: saved, error: vError } = v.id
      ? await db.from('ProductVariant').update(row).eq('id', v.id).select('id').single()
      : await db.from('ProductVariant').insert(row).select('id').single();

    if (vError) {
      if (vError.code === PG.UNIQUE_VIOLATION) {
        throw Conflict('Two variants have the same storage, RAM and colour combination');
      }
      throw vError;
    }
    variantIds.push(saved.id);
  }

  // --- images ---------------------------------------------------------
  const keepImageIds = body.images.map((img) => img.id).filter(Boolean) as string[];

  if (keepImageIds.length > 0) {
    await db
      .from('ProductImage')
      .delete()
      .eq('productId', id)
      .not('id', 'in', `(${keepImageIds.join(',')})`);
  } else {
    await db.from('ProductImage').delete().eq('productId', id);
  }

  for (const [i, img] of body.images.entries()) {
    const row = {
      productId: id,
      variantId: img.variantIndex != null ? variantIds[img.variantIndex] ?? null : null,
      url: img.url,
      alt: img.alt ?? null,
      sortOrder: img.sortOrder || i,
    };

    const { error: iError } = img.id
      ? await db.from('ProductImage').update(row).eq('id', img.id)
      : await db.from('ProductImage').insert(row);

    if (iError) throw iError;
  }

  const { data: updated } = await db.from('Product').select(SELECT).eq('id', id).single();
  return ok(mapProduct(updated));
});

const quickPatchSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  popularity: z.number().int().min(0).max(100).optional(),
});

/**
 * PATCH /api/admin/products/:id
 *
 * Flip a single flag from the list page. PUT requires the whole product
 * including every variant, which is far too much to send just to hide
 * something — and a partial PUT would wipe the variants it omitted.
 */
export const PATCH = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const body = await parseJson(req, quickPatchSchema);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  if (body.isFeatured !== undefined) patch.isFeatured = body.isFeatured;
  if (body.popularity !== undefined) patch.popularity = body.popularity;

  const { data, error } = await db
    .from('Product').update(patch).eq('id', id)
    .select('id, isActive, isFeatured, popularity').maybeSingle();
  if (error) throw error;
  if (!data) throw NotFound('Product not found');

  return ok(data);
});

/**
 * DELETE /api/admin/products/:id
 * Admin only, and soft by default — set ?hard=true to actually remove it.
 * Soft delete keeps the product out of the shop while preserving the
 * inquiry history that references it.
 */
export const DELETE = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const hard = new URL(req.url).searchParams.get('hard') === 'true';

  if (hard) {
    // Inquiry and Lead reference products with ON DELETE SET NULL, so the
    // click history survives as denormalised text. Nothing blocks this —
    // but it is genuinely permanent, hence ADMIN only.
    const { error } = await db.from('Product').delete().eq('id', id);
    if (error) throw error;
    return ok({ deleted: true, mode: 'hard' });
  }

  const { data, error } = await db
    .from('Product')
    .update({ isActive: false, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw NotFound('Product not found');

  return ok({ deleted: true, mode: 'soft' });
});
