/**
 * /api/auth/my-shops — list all shops the current user is a member of,
 * across all statuses (active, invited, suspended). Used by the header
 * shop-switcher dropdown.
 */
import { json } from "@sveltejs/kit";
import { adminClient } from "$lib/server/supabase";
import { apiError, apiUnauthorized } from "$lib/server/apiResponse";
import { MEMBER_STATUS } from "$lib/constants";

export async function GET({ locals }: import("@sveltejs/kit").RequestEvent) {
  if (!locals.user) return apiUnauthorized("Not signed in");

  // Use admin client — auth is already verified by hooks middleware.
  // userClientFromCtx needs cookies which don't exist for bearer-token auth.
  const admin: any = adminClient();
  const { data, error } = await admin
    .from("shop_members")
    .select(`
      role, status, invited_at,
      shop:shops!shop_members_shop_id_fkey(id, name, slug, currency_code, currency_symbol)
    `)
    .eq("user_id", locals.user.id)
    .neq("status", MEMBER_STATUS.SUSPENDED)
    .order("status", { ascending: true }) // invited before active
    .order("role");

  if (error) return apiError(error.message);

  const shops = (data ?? [])
    .map((row: any) => ({
      id: row.shop?.id,
      name: row.shop?.name,
      slug: row.shop?.slug,
      role: row.role,
      status: row.status,
      invited_at: row.invited_at,
      currency_code: row.shop?.currency_code,
      currency_symbol: row.shop?.currency_symbol,
    }))
    .filter((s: any) => s.id);

  return json(shops);
}
