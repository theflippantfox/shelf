import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { customerUpdateSchema } from "$lib/validators/schemas";

/**
 * GET /api/customers/[id] — single customer, scoped to current shop.
 */
export async function GET({
  cookies,
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .maybeSingle();

  if (error) return json({ error: error.message }, { status: 500 });
  if (!data) return json({ error: "Not found" }, { status: 404 });
  return json(data);
}

/**
 * PATCH /api/customers/[id] — update customer. Only whitelisted fields.
 */
export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, customerUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const allowed: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) allowed.name = parsed.data.name;
  if (parsed.data.phone !== undefined) allowed.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) allowed.email = parsed.data.email;
  if (parsed.data.notes !== undefined) allowed.notes = parsed.data.notes;

  if (Object.keys(allowed).length === 0) {
    return json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("customers")
    .update(allowed as any)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/customers/[id] — hard delete, scoped to current shop.
 */
export async function DELETE({
  cookies,
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const supabase = userClientFromCtx({ cookies } as any);
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id);

  if (error) return json({ error: error.message }, { status: 400 });
  return json({ ok: true });
}
