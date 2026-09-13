import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { supplierUpdateSchema } from "$lib/validators/schemas";

/**
 * PATCH /api/suppliers/[id] — update a supplier. Only whitelisted fields.
 */
export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, supplierUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const allowed: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) allowed.name = parsed.data.name;
  if (parsed.data.contact_name !== undefined) allowed.contact_name = parsed.data.contact_name;
  if (parsed.data.phone !== undefined) allowed.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) allowed.email = parsed.data.email;
  if (parsed.data.address !== undefined) allowed.address = parsed.data.address;
  if (parsed.data.notes !== undefined) allowed.notes = parsed.data.notes;
  if (parsed.data.is_active !== undefined) allowed.is_active = parsed.data.is_active;

  if (Object.keys(allowed).length === 0) {
    return json({ error: "No valid fields to update" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("suppliers")
    .update(allowed)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/suppliers/[id] — soft delete (set is_active = false).
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
    .from("suppliers")
    .update({ is_active: false })
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}
