import { db } from '@/lib/supabase';
import { paginated, route } from '@/lib/response';
import { mapProductCard } from '@/lib/mappers';
import { productListQuerySchema, queryObject } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 *   ?brand=samsung&category=smartphones&condition=NEW
 *   &minPrice=50000&maxPrice=300000&inStock=true&featured=true
 *   &search=galaxy&sort=price_asc&page=1&limit=20
 *
 * Reads the ProductCard view, so cheapest price, discount flag, stock
 * flag and primary image all come back in one query — no N+1.
 */
export const GET = route(async (req: Request) => {
  const q = productListQuerySchema.parse(queryObject(req.url));

  // In-stock items first, whatever the sort. PostgREST applies .order()
  // calls in the order they are chained, so this MUST come before the
  // sort below or popularity wins and sold-out phones float to the top.
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
    query = query.or(`name.ilike.%${term}%,brandName.ilike.%${term}%`);
  }

  switch (q.sort) {
    case 'newest':
      query = query.order('createdAt', { ascending: false });
      break;
    case 'price_asc':
      query = query.order('fromPrice', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('fromPrice', { ascending: false });
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    default:
      query = query
        .order('popularity', { ascending: false })
        .order('createdAt', { ascending: false });
  }

  const from = (q.page - 1) * q.limit;
  const { data, error, count } = await query.range(from, from + q.limit - 1);
  if (error) throw error;

  return paginated((data ?? []).map(mapProductCard), q.page, q.limit, count ?? 0);
});
