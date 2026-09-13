import { json } from '@sveltejs/kit';
import { userClientFromCtx } from '$lib/server/supabase';

/**
 * GET /api/suppliers — list (active, with search filter) and create.
 */
export async function GET({ cookies, locals, url }: import('@sveltejs/kit').RequestEvent) {
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });
  const search = url.searchParams.get('search') ?? '';

  const supabase = userClientFromCtx({ cookies } as any);
  let q = supabase
    .from('suppliers')
    .select('*')
    .eq('shop_id', locals.currentShop.id)
    .eq('is_active', true)
    .order('name');

  if (search) q = q.ilike('name', `%${search}%`);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, { status: 500 });
  return json(data ?? []);
}

/**
 * POST /api/suppliers — create a supplier.
 * Only accepts whitelisted fields to prevent mass-assignment.
 */
export async function POST({ cookies, request, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  if (!name) return json({ error: 'name is required' }, { status: 400 });

  const clean = (v: unknown): string | null =>
    v === '' || v === undefined || v === null ? null : String(v);

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name,
      contact_name: clean(body.contact_name),
      phone: clean(body.phone),
      email: clean(body.email),
      address: clean(body.address),
      notes: clean(body.notes),
      shop_id: locals.currentShop.id,
    } as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data, { status: 201 });
}
