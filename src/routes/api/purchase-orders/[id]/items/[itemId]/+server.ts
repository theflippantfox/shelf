import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError, apiCreated } from "$lib/server/apiResponse";

/**
 * POST /api/purchase-orders/[id]/items/[itemId] — duplicate endpoint from the items route.
 * Kept for parity with the previous URL shape.
 */
export async function POST({
  cookies,
  request,
  params,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  const { data, error } = await supabase
    .from("purchase_order_items")
    .insert({ ...body, purchase_order_id: params.id })
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiCreated(data);
}

/**
 * PATCH /api/purchase-orders/[id]/items/[itemId] — update a line item.
 */
export async function PATCH({
  cookies,
  request,
  params,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.itemId) return apiError("Missing itemId", 400);
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  const { data, error } = await supabase
    .from("purchase_order_items")
    .update(body)
    .eq("id", params.itemId)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return json(data);
}

/**
 * DELETE /api/purchase-orders/[id]/items/[itemId] — remove a line item.
 */
export async function DELETE({
  cookies,
  params,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.itemId) return apiError("Missing itemId", 400);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  const { error } = await supabase
    .from("purchase_order_items")
    .delete()
    .eq("id", params.itemId);

  if (error) return apiError(error.message, 400);
  return json({ success: true });
}
