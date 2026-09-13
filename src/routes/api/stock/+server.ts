import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import {
  apiError,
  apiNotFound,
  apiUnauthorized,
} from "$lib/server/apiResponse";

/**
 * POST /api/stock — adjust stock for a product.
 * body: { product_id, delta, reason, reference? }
 *
 * Writes a stock_log entry AND updates product.qty in one atomic operation
 * via a Postgres function (see 0003_functions_create_sale.sql / or inline
 * if not yet present). For now uses two queries; safe enough since both are
 * shop-scoped and validated.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop || !locals.user) return apiUnauthorized("No shop");

  const { product_id, delta, reason, reference } = await request.json();
  if (!product_id || !delta || !reason)
    return apiError("product_id, delta, reason required", 400);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies });

  // Read current qty
  const { data: product, error: readErr } = await supabase
    .from("products")
    .select("id, qty")
    .eq("id", product_id)
    .single();
  if (readErr || !product) return apiNotFound("Product");

  const newQty = Math.max(0, product.qty + delta);

  // Update product
  const { error: upErr } = await supabase
    .from("products")
    .update({ qty: newQty })
    .eq("id", product_id);
  if (upErr) return apiError(upErr.message, 400);

  // Insert stock_log entry
  const { error: logErr } = await supabase.from("stock_log").insert({
    shop_id: locals.currentShop.id,
    product_id,
    delta,
    reason,
    reference: reference ?? null,
    created_by: locals.user.id,
  });
  if (logErr) return apiError(logErr.message, 400);

  return json({ ok: true, qty: newQty });
}
