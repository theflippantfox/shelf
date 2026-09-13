import { json, error } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError } from "$lib/server/apiResponse";
import { PO_STATUS } from "$lib/constants";

/**
 * GET /api/purchase-orders/[id] — single PO with items.
 */
export async function GET({
  cookies,
  params,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  const [{ data: order, error: oErr }, { data: items, error: iErr }] =
    await Promise.all([
      supabase
        .from("purchase_orders")
        .select(
          "*, supplier:suppliers(id, name, contact_name, phone), created_by:profiles!purchase_orders_created_by_fkey(first_name, last_name)",
        )
        .eq("id", params.id)
        .single(),
      supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", params.id)
        .order("id"),
    ]);

  if (oErr || iErr || !order) throw error(404, "Purchase order not found");
  return json({ ...order, items: items ?? [] });
}

/**
 * PATCH /api/purchase-orders/[id] — partial update.
 */
export async function PATCH({
  cookies,
  params,
  request,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  const body = await request.json();

  const ALLOWED = [
    "status",
    "expected_delivery_date",
    "received_date",
    "notes",
    "order_ref",
    "tax_amount",
    "shipping_cost",
    "total_cost",
  ];
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.includes(k)) safe[k] = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  if ("tax_amount" in safe || "shipping_cost" in safe) {
    const { data: current } = await supabase
      .from("purchase_orders")
      .select("subtotal, tax_amount, shipping_cost")
      .eq("id", params.id)
      .single();
    if (current) {
      const sub = (current as any).subtotal ?? 0;
      const tax = Number(
        safe["tax_amount"] ?? (current as any).tax_amount ?? 0,
      );
      const ship = Number(
        safe["shipping_cost"] ?? (current as any).shipping_cost ?? 0,
      );
      safe["total_cost"] = sub + tax + ship;
    }
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(safe)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return json(data);
}

/**
 * DELETE /api/purchase-orders/[id] — cancel (only draft/ordered allowed).
 */
export async function DELETE({
  cookies,
  params,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  const { data: current } = await supabase
    .from("purchase_orders")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!current || !["draft", "ordered"].includes((current as any).status)) {
    return apiError("Only draft or ordered POs can be cancelled", 400);
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: PO_STATUS.CANCELLED })
    .eq("id", params.id);

  if (error) return apiError(error.message, 400);
  return json({ ok: true });
}
