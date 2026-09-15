import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { supplierUpdateSchema } from "$lib/validators/schemas";
import { apiError, apiOk, apiUnauthorized } from "$lib/server/apiResponse";

/**
 * PATCH /api/suppliers/[id] — update a supplier. Only whitelisted fields.
 */
export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");

  const parsed = await parseBody(request, supplierUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const allowed: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) allowed.name = parsed.data.name;
  if (parsed.data.contact_name !== undefined)
    allowed.contact_name = parsed.data.contact_name;
  if (parsed.data.phone !== undefined) allowed.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) allowed.email = parsed.data.email;
  if (parsed.data.address !== undefined) allowed.address = parsed.data.address;
  if (parsed.data.notes !== undefined) allowed.notes = parsed.data.notes;
  if (parsed.data.is_active !== undefined)
    allowed.is_active = parsed.data.is_active;

  if (Object.keys(allowed).length === 0) {
    return apiError("No valid fields to update", 400);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies, locals } as any);
  const { data, error } = await supabase
    .from("suppliers")
    .update(allowed)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiOk(data);
}

/**
 * DELETE /api/suppliers/[id] — soft delete (set is_active = false).
 */
export async function DELETE({
  cookies,
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies, locals } as any);
  const { data, error } = await supabase
    .from("suppliers")
    .update({ is_active: false })
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiOk(data);
}
