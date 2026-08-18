import { db } from '@/lib/supabase';
import { ok, route } from '@/lib/response';
import { mapPlan } from '@/lib/mappers';
import { queryObject } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * GET /api/installment-plans?amount=289900
 * With an amount, returns only plans the phone qualifies for and
 * includes the monthly figure so the frontend does no maths.
 */
export const GET = route(async (req: Request) => {
  const { amount } = queryObject(req.url);
  const price = amount ? Number(amount) : null;

  let query = db
    .from('InstallmentPlan')
    .select('id, bankName, logo, months, interestPct, minAmount')
    .eq('isActive', true)
    .order('sortOrder', { ascending: true });

  if (price !== null && Number.isFinite(price)) {
    query = query.lte('minAmount', price);
  }

  const { data, error } = await query;
  if (error) throw error;

  const plans = (data ?? []).map(mapPlan);

  if (price === null || !Number.isFinite(price)) return ok(plans);

  return ok(
    plans.map((p) => ({
      ...p,
      monthlyAmount: Math.round((price * (1 + p.interestPct / 100)) / p.months),
      totalAmount: Math.round(price * (1 + p.interestPct / 100)),
    })),
  );
});
