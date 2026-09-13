import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { categoryUpdateSchema } from "$lib/validators/schemas";

/**
 * PATCH /api/categories/[id] — update a category. Only whitelisted fields.
 */
export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, categoryUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const allowed: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) allowed.name = parsed.data.name;
  if (parsed.data.icon !== undefined) allowed.icon = parsed.data.icon;
  if (parsed.data.color !== undefined) allowed.color = parsed.data.color;
  if (parsed.data.sort_order !== undefined)
    allowed.sort_order = parsed.data.sort_order;

  if (Object.keys(allowed).length === 0) {
    return json({ error: "No valid fields to update" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("categories")
    .update(allowed as any)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/categories/[id] — soft-delete by setting archived_at.
 */
export async function DELETE({
  cookies,
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}
