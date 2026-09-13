/**
 * /api/settings — shop settings.
 *
 * PATCH: update shop settings. Owner only. Whitelisted fields.
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError, apiForbidden, apiUnauthorized } from "$lib/server/apiResponse";

export async function PATCH({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return apiUnauthorized("No shop");
  if (locals.shopMember?.role !== "owner")
    return apiForbidden("Only owners can update shop settings");

  const body = await request.json();
  const ALLOWED = [
    "name",
    "timezone",
    "currency_code",
    "currency_symbol",
    "currency_locale",
    "date_format",
    "time_format",
    "tax_rate",
    "tax_inclusive",
    "tax_name",
    "theme",
    "palette_id",
    "primary_color",
    "sidebar_bg",
    "low_stock_threshold",
    "receipt_header",
    "receipt_footer",
    "country_code",
  ];
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.includes(k)) safe[k] = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("shops")
    .update(safe as any)
    .eq("id", locals.currentShop.id)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return json(data);
}
