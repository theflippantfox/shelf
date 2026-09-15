import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError, apiUnauthorized, apiCreated } from "$lib/server/apiResponse";

/**
 * POST /api/purchase-orders/[id]/items — add a line item to a PO.
 */
export async function POST({
  cookies,
  params,
  locals,
  request,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies, locals } as any);

  const { data, error } = await supabase
    .from("purchase_order_items")
    .insert({
      purchase_order_id: params.id,
      product_id: body.product,
      product_name: body.product_name,
      product_sku: body.product_sku,
      quantity_ordered: body.quantity_ordered ?? 0,
      unit_cost: body.unit_cost ?? 0,
      line_total: body.line_total ?? 0,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiCreated(data);
}
