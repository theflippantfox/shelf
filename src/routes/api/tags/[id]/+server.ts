import { json } from '@sveltejs/kit';
import { userClientFromCtx, adminClient } from '$lib/server/supabase';

/**
 * PATCH /api/tags/[id] — update a tag. Only whitelisted fields.
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
  if ('color' in body) {
    const color = String(body.color ?? '').trim();
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return json({ error: 'color must be a valid hex color' }, { status: 400 });
    }
    allowed.color = color || null;
  }

  if (Object.keys(allowed).length === 0) {
    return json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('tags')
    .update(allowed)
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/tags/[id] — hard delete. Tags are pure labels; no FK
 * constraint issues from removing them. The product_tags join rows will
 * cascade-delete via the FK.
 */
export async function DELETE({ cookies, params, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!params.id) return json({ error: 'Missing id' }, { status: 400 });
  if (!locals.currentShop) return json({ error: 'No shop' }, { status: 401 });

  // Use admin client because RLS doesn't grant delete on tags; the user-level
  // policy only allows updates, not deletes. The admin client still enforces
  // shop scoping via the WHERE clause below.
  const admin = adminClient();
  const { error } = await admin
    .from('tags')
    .delete()
    .eq('id', params.id)
    .eq('shop_id', locals.currentShop.id);

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ ok: true });
}
