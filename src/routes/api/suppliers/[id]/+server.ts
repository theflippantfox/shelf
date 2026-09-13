import { json } from '@sveltejs/kit';
import { userClientFromCtx } from '$lib/server/supabase';

/**
 * PATCH /api/suppliers/[id] — update a supplier. Only whitelisted fields.
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
  if ('name' in body) {
    const name = String(body.name ?? '').trim();
    if (!name) return json({ error: 'name cannot be empty' }, { status: 400 });
    allowed.name = name;
  }
  if ('contact_name' in body) allowed.contact_name = clean(body.contact_name);
  if ('phone' in body) allowed.phone = clean(body.phone);
  if ('email' in body) allowed.email = clean(body.email);
  if ('address' in body) allowed.address = clean(body.address);
  if ('notes' in body) allowed.notes = clean(body.notes);
  if ('is_active' in body) allowed.is_active = body.is_active;

  if (Object.keys(allowed).length === 0) {
    return json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('suppliers')
    .update(allowed as any)
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/suppliers/[id] — soft delete (set is_active = false).
 */
export async function DELETE({ cookies, params, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!params.id) return json({ error: 'Missing id' }, { status: 400 });
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('suppliers')
    .update({ is_active: false } as any)
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}
