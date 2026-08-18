import { db } from '@/lib/supabase';
import { created, ok, route } from '@/lib/response';
import { parseJson, planSchema } from '@/lib/validation';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  await requireStaff(req);
  const { data, error } = await db
    .from('InstallmentPlan').select('*').order('sortOrder', { ascending: true });
  if (error) throw error;
  return ok((data ?? []).map((p) => ({
    ...p,
    interestPct: Number(p.interestPct),
    minAmount: Number(p.minAmount),
  })));
});

export const POST = route(async (req: Request) => {
  await requireStaff(req);
  const body = await parseJson(req, planSchema);
  const { data, error } = await db.from('InstallmentPlan').insert(body).select('*').single();
  if (error) throw error;
  return created(data);
});
