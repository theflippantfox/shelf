import { json } from "@sveltejs/kit";
import { adminClient } from "$lib/server/supabase";
import { shopSchema } from "$lib/validators/schemas";
import { parseBody } from "$lib/validators/parseBody";
import { apiError, apiUnauthorized, apiCreated } from "$lib/server/apiResponse";
import { MEMBER_STATUS } from "$lib/constants";

const SHOP_COOKIE = "shelf-current-shop";

/**
 * POST /api/onboarding/shop — create the first shop for the current user.
 * User becomes the owner via a shop_members row.
 */
export async function POST({
  request,
  locals,
  cookies,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.user) return apiUnauthorized("Not authenticated");

  const parsed = await parseBody(request, shopSchema);
  if (!parsed.ok) return parsed.response;
  const { name, slug } = parsed.data;

  // Slug — unique, lowercase, hyphens only
  const finalSlug = (slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = adminClient();
  const { data: existing } = await admin
    .from("shops")
    .select("id")
    .eq("slug", finalSlug)
    .maybeSingle();

  if (existing) return apiError("That handle is already taken", 409);

  const { data: shop, error: shopErr } = await admin
    .from("shops")
    .insert({
      owner_id: locals.user.id,
      name,
      slug: finalSlug,
      // Sensible defaults — the /onboarding/locale step overrides these.
      country_code: "IN",
      currency_code: "INR",
      currency_symbol: "₹",
      currency_locale: "en-IN",
      timezone: "Asia/Kolkata",
      date_format: "YYYY-MM-DD",
      time_format: "24h",
      tax_rate: 0,
      tax_inclusive: false,
      tax_name: "GST",
      theme: "system",
      primary_color: "#7B4F8A",
      sidebar_bg: "#150F1C",
      onboarding_complete: false,
      onboarding_step: "locale",
      low_stock_threshold: 10,
    } as any)
    .select()
    .single();

  if (shopErr || !shop)
    return apiError(shopErr?.message ?? "Failed to create shop", 500);

  // Add the creator as owner
  const { error: memberErr } = await admin.from("shop_members").insert({
    shop_id: (shop as any).id,
    user_id: locals.user.id,
    role: "owner",
    status: MEMBER_STATUS.ACTIVE,
    invited_at: new Date().toISOString(),
  });

  if (memberErr) return apiError(memberErr.message);

  // Pin the shop cookie so subsequent onboarding requests have a shop context
  cookies.set(SHOP_COOKIE, (shop as any).id, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return apiCreated({ shopId: (shop as any).id });
}
