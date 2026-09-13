/**
 * /api/cash-register/transfer — move money between destinations.
 *
 * POST body: { from: 'counter'|'bank'|'other', to: ..., amount: number, notes?: string, effective_at?: ISO }
 *
 * Records as a paired IN/OUT set sharing a transfer_group_id. Net
 * effect on the shop total is zero; only the per-destination balance
 * changes.
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import {
  apiError,
  apiForbidden,
  apiUnauthorized,
} from "$lib/server/apiResponse";
import { ROLES, VALID_DESTINATIONS, MEMBER_STATUS } from "$lib/constants";

export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop || !locals.user) {
    return apiUnauthorized("No shop");
  }

  // Owner/manager only — transfers move real money between drawers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({
    cookies,
  } as any);
  const { data: member, error: memberErr } = await supabase
    .from("shop_members")
    .select("role, status")
    .eq("shop_id", locals.currentShop.id)
    .eq("user_id", locals.user.id)
    .single();
  if (memberErr || !member) return apiForbidden("No membership");
  if ((member as any).status !== MEMBER_STATUS.ACTIVE)
    return apiForbidden("Membership is not active");
  if ((member as any).role === ROLES.CASHIER)
    return apiForbidden("Only owners and managers can transfer");

  const body = await request.json();
  const { from, to, amount, notes, effective_at } = body ?? {};
  if (!from || !to) return apiError("from and to are required", 400);
  if (!VALID_DESTINATIONS.includes(from) || !VALID_DESTINATIONS.includes(to)) {
    return apiError("Invalid destination", 400);
  }
  if (from === to)
    return apiError("Cannot transfer to the same destination", 400);
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return apiError("amount must be a positive number", 400);
  }

  const { error } = await supabase.rpc("transfer_register", {
    p_shop_id: locals.currentShop.id,
    p_from: from,
    p_to: to,
    p_amount: amount,
    p_notes: notes ?? "",
    p_actor_id: locals.user.id,
    p_effective_at: effective_at ?? null,
  });
  if (error) return apiError(error.message, 400);
  return json({ ok: true });
}
