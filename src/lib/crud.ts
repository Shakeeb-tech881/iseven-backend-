import { db, PG } from './supabase';
import { Conflict, NotFound } from './errors';

/**
 * Brands and categories are referenced by products with ON DELETE
 * RESTRICT, so a delete fails with a foreign key error rather than
 * silently orphaning stock. That error is correct but unreadable, so
 * we turn it into something a shop assistant can act on.
 */
export async function deleteOrExplain(
  table: string,
  id: string,
  inUseMessage: string,
): Promise<void> {
  const { error, count } = await db
    .from(table)
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    if (error.code === PG.FOREIGN_KEY_VIOLATION) throw Conflict(inUseMessage);
    throw error;
  }
  if (!count) throw NotFound('Not found');
}
