import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { mapCategory } from '@/lib/mappers';

export const revalidate = 300;

export const GET = route(async () => {
  const { data, error } = await db
    .from('Category')
    .select('id, name, slug, icon')
    .eq('isActive', true)
    .order('sortOrder', { ascending: true });

  if (error) throw error;
  return ok((data ?? []).map(mapCategory));
});
