import { db } from '@/lib/supabase';
import { ok, route, type RouteCtx } from '@/lib/response';
import { NotFound } from '@/lib/errors';
import { leadUpdateSchema, parseJson } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** PATCH /api/admin/leads/:id — move a lead through NEW to SOLD or LOST. */
export const PATCH = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;

  const body = await parseJson(req, leadUpdateSchema);

  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.status !== undefined) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes;

  const { data, error } = await db
    .from('Lead')
    .update(patch)
    .eq('id', id)
    .select('id, status, notes, updatedAt')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw NotFound('Lead not found');

  return ok(data);
});

/**
 * Hard delete. A lead holds a customer's name and phone number, so
 * under the PDPA someone asking to be removed must actually be removed
 * — a soft delete would not satisfy that.
 */
export const DELETE = route(async (req: Request, ctx: RouteCtx<{ id: string }>) => {
  await requireStaff(req);
  const { id } = await ctx.params;
  const { error } = await db.from('Lead').delete().eq('id', id);
  if (error) throw error;
  return ok({ deleted: true });
});
