import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError, apiUnauthorized, apiCreated } from "$lib/server/apiResponse";

/**
 * GET /api/products — list products for the current shop.
 * Supports filters: search (name/sku), category, alert (low-stock).
 *
 * Uses userClient (RLS-correct) instead of adminClient.
 */
export async function GET({
  cookies,
  locals,
  url,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json([]);
  const shopId = locals.currentShop.id;
  const search = url.searchParams.get("search") ?? "";
  const cat = url.searchParams.get("category") ?? "";
  const alert = url.searchParams.get("alert");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)),
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = userClientFromCtx({ cookies } as any);
  let q = supabase
    .from("products")
    .select(
      "id, name, sku, description, price, cost_price, qty, low_stock_threshold, track_stock, track_barcode, barcode, image_url, archived_at, category_id, category:categories(id, name, color, icon)",
      { count: "exact" },
    )
    .eq("shop_id", shopId)
    .is("archived_at", null)
    .order("name")
    .range(from, to);

  if (cat) q = q.eq("category_id", cat);
  if (search) q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);

  const { data: products, error, count } = await q;
  if (error) return apiError(error.message);

  let result = products ?? [];
  if (alert === "true") {
    const threshold = locals.currentShop.low_stock_threshold ?? 10;
    // Only flag low-stock when the product is actually tracking stock.
    // track_stock=false opts the product out of low-stock alerts entirely.
    result = result.filter(
      (p: any) =>
        p.track_stock !== false &&
        (p.qty === 0 || p.qty <= (p.low_stock_threshold ?? threshold)),
    );
  }

  return json({
    data: result,
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/**
 * POST /api/products — create a product.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return apiUnauthorized("No shop");
  const body = await request.json();
  const supabase = userClientFromCtx({ cookies } as any);

  // Auto-generate SKU if not provided
  let sku = body.sku?.trim();
  if (!sku) {
    const { generateSku } = await import("$lib/utils/sku");
    sku = await generateSku(locals.currentShop.id, body.name ?? "PROD");
  }

  // Whitelist allowed fields. Map `category` (page) → `category_id` (DB).
  // Empty strings are coerced to null so uuid/text columns don't choke.
  const clean = (v: any) => (v === "" || v === undefined ? null : v);
  const allowed: any = {
    name: body.name,
    sku,
    shop_id: locals.currentShop.id,
    price: body.price ?? 0,
    cost_price: body.cost_price ?? 0,
    qty: body.qty ?? 0,
    unit: body.unit ?? "pcs",
    category_id: clean(body.category_id ?? body.category),
    description: clean(body.description),
    low_stock_threshold:
      body.low_stock_threshold === "" ? 5 : (body.low_stock_threshold ?? 5),
    // When track_barcode is false, ignore the barcode field entirely
    // (clear it on the DB side too so old barcodes don't stick around).
    barcode: body.track_barcode === false ? null : clean(body.barcode),
    track_stock: body.track_stock !== false, // default true
    track_barcode: body.track_barcode !== false, // default true
  };
  const { data, error } = await supabase
    .from("products")
    .insert(allowed)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return apiCreated(data);
}
