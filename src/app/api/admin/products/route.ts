import { db, PG } from '@/lib/supabase';
import { created, paginated, route } from '@/lib/response';
import { Conflict, BadRequest } from '@/lib/errors';
import { parseJson, productCreateSchema, queryObject } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';
import { slugify } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** GET /api/admin/products — includes inactive products, unlike the public list. */
export const GET = route(async (req: Request) => {
  await requireStaff(req);

  const { page = '1', limit = '20', search } = queryObject(req.url);
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 20));

  let query = db
    .from('Product')
    .select(`
      id, name, slug, condition, isActive, isFeatured, popularity, createdAt,
      brand:Brand!Product_brandId_fkey ( name ),
      category:Category!Product_categoryId_fkey ( name ),
      variants:ProductVariant ( id, price, salePrice, stockStatus )
    `, { count: 'exact' })
    .order('createdAt', { ascending: false });

  if (search) query = query.ilike('name', `%${search.replace(/[%,]/g, ' ')}%`);

  const from = (p - 1) * l;
  const { data, error, count } = await query.range(from, from + l - 1);
  if (error) throw error;

  return paginated(data ?? [], p, l, count ?? 0);
});

/** POST /api/admin/products — creates the product and all its variants and images. */
export const POST = route(async (req: Request) => {
  await requireStaff(req);

  const body = await parseJson(req, productCreateSchema);
  const slug = body.slug?.trim() || slugify(body.name);

  const { data: product, error } = await db
    .from('Product')
    .insert({
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
    })
    .select('id, slug')
    .single();

  if (error) {
    if (error.code === PG.UNIQUE_VIOLATION) throw Conflict(`The slug "${slug}" is already in use`);
    if (error.code === PG.FOREIGN_KEY_VIOLATION) throw BadRequest('Unknown brand or category');
    throw error;
  }

  // No transactions over PostgREST, so clean up manually if a child insert
  // fails. Otherwise you are left with a product that has no variants and
  // therefore never appears in the listing view.
  const { data: insertedVariants, error: variantError } = await db
    .from('ProductVariant')
    .insert(
      body.variants.map((v, i) => ({
        productId: product.id,
        sku: v.sku ?? null,
        storage: v.storage ?? null,
        ram: v.ram ?? null,
        color: v.color ?? null,
        colorHex: v.colorHex ?? null,
        price: v.price,
        salePrice: v.salePrice ?? null,
        stockStatus: v.stockStatus,
        sortOrder: v.sortOrder || i,
      })),
    )
    .select('id, sortOrder');

  if (variantError) {
    await db.from('Product').delete().eq('id', product.id);
    if (variantError.code === PG.UNIQUE_VIOLATION) {
      throw Conflict('Two variants have the same storage, RAM and colour combination');
    }
    throw variantError;
  }

  // Variants come back in insert order, so position maps to the index the
  // form sent. That is what lets a photo be linked to a colour on the very
  // first save, before any variant has an id.
  const variantIds = [...(insertedVariants ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((v) => v.id);

  if (body.images.length > 0) {
    const { error: imageError } = await db.from('ProductImage').insert(
      body.images.map((img, i) => ({
        productId: product.id,
        variantId:
          img.variantIndex != null ? variantIds[img.variantIndex] ?? null : null,
        url: img.url,
        alt: img.alt ?? null,
        sortOrder: img.sortOrder || i,
      })),
    );
    if (imageError) {
      await db.from('Product').delete().eq('id', product.id);
      throw imageError;
    }
  }

  return created({ id: product.id, slug: product.slug, variantCount: variantIds.length });
});
