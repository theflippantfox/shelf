import { json } from "@sveltejs/kit";
import { apiError } from "$lib/server/apiResponse";
import { adminClient } from "$lib/server/supabase";
export async function POST({
  request,
  cookies,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  const body = await request.json();
  const shopId = body.shopId ?? body.shop_id;
  if (!shopId) return apiError("shopId required", 400);

  // Verify the user is a member of this shop
  if (locals.user) {
    const admin: any = adminClient();
    const { data: member } = await admin
      .from("shop_members")
      .select("id")
      .eq("user_id", locals.user.id)
      .eq("shop_id", shopId)
      .single();

    if (!member) return apiError("Not a member of this shop", 403);
  }

  cookies.set("shelf-current-shop", shopId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Return the shop details so API clients can populate local state
  const admin: any = adminClient();
  const { data: shop } = await admin
    .from("shops")
    .select(
      "id, name, slug, currency_code, currency_symbol, display_currency_code, display_currency_symbol, tax_rate, tax_name, timezone, locale, palette_id, theme, receipt_header, receipt_footer",
    )
    .eq("id", shopId)
    .single();

  return json({ ok: true, shop: shop ?? null });
}
