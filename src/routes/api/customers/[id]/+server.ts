import { json } from '@sveltejs/kit';
import { userClientFromCtx } from '$lib/server/supabase';

/**
 * GET /api/customers/[id] — single customer, scoped to current shop.
 */
export async function GET({ cookies, params, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!params.id) return json({ error: 'Missing id' }, { status: 400 });
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .maybeSingle();

  if (error) return json({ error: error.message }, { status: 500 });
  if (!data) return json({ error: 'Not found' }, { status: 404 });
  return json(data);
}

/**
 * PATCH /api/customers/[id] — update customer. Only whitelisted fields.
 */
export async function PATCH({ cookies, params, request, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!params.id) return json({ error: 'Missing id' }, { status: 400 });
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const clean = (v: unknown): string | null =>
    v === '' || v === undefined || v === null ? null : String(v);

  const allowed: Record<string, unknown> = {};
  if ('name' in body) allowed.name = String(body.name ?? '').trim();
  if ('phone' in body) allowed.phone = clean(body.phone);
  if ('email' in body) allowed.email = clean(body.email);
  if ('notes' in body) allowed.notes = clean(body.notes);

  if (Object.keys(allowed).length === 0) {
    return json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('customers')
    .update(allowed)
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/customers/[id] — hard delete, scoped to current shop.
 */
export async function DELETE({ cookies, params, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!params.id) return json({ error: 'Missing id' }, { status: 400 });
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  const supabase = userClientFromCtx({ cookies } as any);
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id);

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ ok: true });
}
