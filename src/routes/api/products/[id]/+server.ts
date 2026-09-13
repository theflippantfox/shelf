import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";

/**
 * GET /api/products/[id] — single product with category join, scoped to current shop.
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
    .from("products")
    .select("*, category:categories(*)")
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .maybeSingle();

  if (error) return json({ error: error.message }, { status: 500 });
  if (!data) return json({ error: "Not found" }, { status: 404 });
  return json(data);
}

/**
 * PATCH /api/products/[id] — update product fields. Scoped to current shop.
 */
export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return json({ error: "Missing id" }, { status: 400 });
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });
  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);

  // Whitelist allowed fields. Map `category` → `category_id`. Empty strings → null.
  const clean = (v: any) => (v === "" || v === undefined ? null : v);
  const allowed: any = {};
  if ("name" in body) allowed.name = body.name;
  if ("sku" in body) allowed.sku = body.sku;
  if ("price" in body) allowed.price = body.price;
  if ("cost_price" in body) allowed.cost_price = body.cost_price;
  if ("qty" in body) allowed.qty = body.qty;
  if ("unit" in body) allowed.unit = body.unit;
  if ("description" in body) allowed.description = clean(body.description);
  if ("low_stock_threshold" in body) {
    const v = body.low_stock_threshold;
    allowed.low_stock_threshold =
      v === null || v === undefined || v === "" || Number.isNaN(v) ? 5 : v;
  }
  if ("track_stock" in body) {
    allowed.track_stock = body.track_stock !== false;
    if (body.track_stock === false) allowed.low_stock_threshold = 0;
  }
  if ("track_barcode" in body) {
    allowed.track_barcode = body.track_barcode !== false;
    if (body.track_barcode === false) allowed.barcode = null;
  }
  if ("barcode" in body) allowed.barcode = clean(body.barcode);
  if ("category_id" in body || "category" in body) {
    allowed.category_id = clean(body.category_id ?? body.category);
  }

  const { data, error } = await supabase
    .from("products")
    .update(allowed)
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}

/**
 * DELETE /api/products/[id] — soft-delete by setting archived_at. Scoped to current shop.
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
    .from("products")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("shop_id", locals.currentShop.id)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data);
}
