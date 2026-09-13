import { json } from '@sveltejs/kit';
import { userClientFromCtx } from '$lib/server/supabase';

/**
 * GET /api/tags — list tags for the current shop.
 */
export async function GET({ cookies, locals }: import('@sveltejs/kit').RequestEvent) {
  if (!locals.currentShop) return json([]);
  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('shop_id', locals.currentShop.id)
    .order('name');

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data ?? []);
}

/**
 * POST /api/tags — create a tag.
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

  const color = body.color ? String(body.color).trim() : undefined;
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return json({ error: 'color must be a valid hex color' }, { status: 400 });
  }

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, color: color ?? null, shop_id: locals.currentShop.id } as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data, { status: 201 });
}
