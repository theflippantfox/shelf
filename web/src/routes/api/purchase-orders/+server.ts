import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError, apiUnauthorized, apiCreated } from "$lib/server/apiResponse";
import { PO_STATUS } from "$lib/constants";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function genRef() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PO-${d}-${rand}`;
}

/**
 * GET /api/purchase-orders — list with status/supplier filters.
 */
export async function GET({
  cookies,
  locals,
  url,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return apiUnauthorized("No shop");

  const status = url.searchParams.get("status") ?? "";
  const supplier = url.searchParams.get("supplier") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 50;

  const supabase = userClientFromCtx({ cookies, locals } as any);
  let q = supabase
    .from("purchase_orders")
    .select(
      "id, order_ref, status, order_date, expected_delivery_date, received_date, subtotal, tax_amount, shipping_cost, total_cost, notes, created_at, supplier:suppliers(id, name), created_by:profiles!purchase_orders_created_by_fkey(first_name, last_name)",
    )
    .eq("shop_id", locals.currentShop.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) q = q.eq("status", status);
  if (supplier) q = q.eq("supplier_id", supplier);

  const { data, error } = await q;
  if (error) return apiError(error.message);
  return json(data ?? []);
}

/**
 * POST /api/purchase-orders — create a PO header.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop || !locals.user)
    return apiUnauthorized("Unauthorized");

  const body = await request.json();

  if (!body.supplier) return apiError("supplier is required", 400);
  const supplierStr = String(body.supplier).trim();

  if (!UUID_RE.test(supplierStr)) {
    return apiError(
      `Invalid supplier value "${supplierStr}". Select a supplier from the dropdown.`,
      400,
    );
  }

  if (!body.order_date) return apiError("order_date is required", 400);

  const subtotal = Number(body.subtotal ?? 0);
  const taxAmount = Number(body.tax_amount ?? 0);
  const shippingCost = Number(body.shipping_cost ?? 0);
  const totalCost = subtotal + taxAmount + shippingCost;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies, locals } as any);
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      shop_id: locals.currentShop.id,
      supplier_id: supplierStr,
      order_ref: body.order_ref?.trim() || genRef(),
      status: body.status ?? PO_STATUS.DRAFT,
      order_date: body.order_date,
      expected_delivery_date: body.expected_delivery_date || null,
      subtotal,
      tax_amount: taxAmount,
      shipping_cost: shippingCost,
      total_cost: totalCost,
      notes: body.notes || null,
      created_by: locals.user.id,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiCreated(data);
}
