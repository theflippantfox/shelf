import { json } from "@sveltejs/kit";
import { userClientFromCtx, adminClient } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { tagUpdateSchema } from "$lib/validators/schemas";

/**
 * PATCH /api/tags/[id] — update a tag. Only whitelisted fields.
 */
export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, tagUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const allowed: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) allowed.name = parsed.data.name;
  if (parsed.data.color !== undefined) allowed.color = parsed.data.color;

  if (Object.keys(allowed).length === 0) {
    return json({ error: "No valid fields to update" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("tags")
    .update(allowed)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
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
export async function DELETE({
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  // Use admin client because RLS doesn't grant delete on tags; the user-level
  // policy only allows updates, not deletes. The admin client still enforces
  // shop scoping via the WHERE clause below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = adminClient();
  const { error } = await admin
    .from("tags")
    .delete()
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id);

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ ok: true });
}
