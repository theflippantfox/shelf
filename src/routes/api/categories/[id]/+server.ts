import { json } from '@sveltejs/kit';
import { userClientFromCtx } from '$lib/server/supabase';

/**
 * PATCH /api/categories/[id] — update a category. Only whitelisted fields.
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

  const allowed: Record<string, unknown> = {};
  if ('name' in body) {
    const name = String(body.name ?? '').trim();
    if (!name) return json({ error: 'name cannot be empty' }, { status: 400 });
    allowed.name = name;
  }
  if ('icon' in body) {
    const icon = String(body.icon ?? '').trim();
    if (!icon) return json({ error: 'icon cannot be empty' }, { status: 400 });
    allowed.icon = icon;
  }
  if ('color' in body) {
    const color = String(body.color ?? '').trim();
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return json({ error: 'color must be a valid hex color' }, { status: 400 });
    }
    allowed.color = color;
  }
  if ('sort_order' in body) {
    allowed.sort_order = typeof body.sort_order === 'number' ? body.sort_order : 0;
  }

  if (Object.keys(allowed).length === 0) {
    return json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('categories')
    .update(allowed as any)
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/categories/[id] — soft-delete by setting archived_at.
 */
export async function DELETE({ cookies, params, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!params.id) return json({ error: 'Missing id' }, { status: 400 });
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('categories')
    .update({ archived_at: new Date().toISOString() } as any)
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}
