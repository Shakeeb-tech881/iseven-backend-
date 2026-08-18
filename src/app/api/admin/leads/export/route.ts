import { db } from '@/lib/supabase';
import { route } from '@/lib/response';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Leading =, +, - or @ makes Excel treat a cell as a formula, which is
  // a real injection vector when the text came from a web form.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** GET /api/admin/leads/export → CSV download */
export const GET = route(async (req: Request) => {
  await requireStaff(req);

  const status = new URL(req.url).searchParams.get('status');

  let query = db
    .from('Lead')
    .select('createdAt, name, phone, email, city, productName, variantLabel, price, status, notes, message')
    .order('createdAt', { ascending: false })
    .limit(5000);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  const headers = ['Date', 'Name', 'Phone', 'Email', 'City', 'Product', 'Option', 'Price', 'Status', 'Notes', 'Message'];
  const lines = [headers.map(cell).join(',')];

  for (const l of data ?? []) {
    lines.push([
      l.createdAt, l.name, l.phone, l.email, l.city,
      l.productName, l.variantLabel, l.price, l.status, l.notes, l.message,
    ].map(cell).join(','));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response('\uFEFF' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="iseven-leads-${stamp}.csv"`,
    },
  });
});
