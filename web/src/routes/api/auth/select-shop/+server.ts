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
    const { data: member, error: memberErr } = await admin
      .from("shop_members")
      .select("id")
      .eq("user_id", locals.user.id)
      .eq("shop_id", shopId)
      .single();

    if (memberErr || !member) {
      console.error("[select-shop] membership check failed:", memberErr);
      return apiError("Not a member of this shop", 403);
    }
  }

  cookies.set("shelf-current-shop", shopId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Return the shop details so API clients can populate local state
  const admin: any = adminClient();
  const { data: shop, error: shopErr } = await admin
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .single();

  if (shopErr) {
    console.error("[select-shop] shop lookup failed:", shopErr);
    return apiError("Shop not found", 404);
  }

  return json({ ok: true, shop });
}
