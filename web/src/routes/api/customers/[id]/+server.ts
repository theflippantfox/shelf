import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { customerUpdateSchema } from "$lib/validators/schemas";
import {
  apiError,
  apiNotFound,
  apiOk,
  apiUnauthorized,
} from "$lib/server/apiResponse";

/**
 * GET /api/customers/[id] — single customer, scoped to current shop.
 */
export async function GET({
  cookies,
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");

  const supabase = userClientFromCtx({ cookies, locals } as any);
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .maybeSingle();

  if (error) return apiError(error.message);
  if (!data) return apiNotFound("Customer");
  return apiOk(data);
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
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");

  const parsed = await parseBody(request, customerUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const allowed: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) allowed.name = parsed.data.name;
  if (parsed.data.phone !== undefined) allowed.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) allowed.email = parsed.data.email;
  if (parsed.data.notes !== undefined) allowed.notes = parsed.data.notes;

  if (Object.keys(allowed).length === 0) {
    return apiError("No valid fields to update", 400);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies, locals } as any);
  const { data, error } = await supabase
    .from("customers")
    .update(allowed)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiOk(data);
}

/**
 * DELETE /api/customers/[id] — hard delete, scoped to current shop.
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
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id);

  if (error) return apiError(error.message, 400);
  return json({ ok: true });
}
