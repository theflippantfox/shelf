/**
 * /api/sales/[id]/credit-payment — record a payment against a credit sale.
 *
 * Body: { amount: number, destination: 'counter'|'bank'|'other', notes?: string }
 *
 * Settles some or all of the outstanding credit. The amount is moved
 * from the cash_register 'credit' destination (the receivable) to the
 * chosen real destination (where the money actually landed).
 *
 * Permissions: owner + manager (cashier can't record a payment on someone
 * else's behalf).
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { requireRole } from "$lib/server/auth";
import { ADMIN_ROLES, VALID_DESTINATIONS, DESTINATION } from "$lib/constants";
import { apiError, apiOk, apiUnauthorized } from "$lib/server/apiResponse";

export async function POST({
 cookies,
 params,
 request,
 locals,
}: import("@sveltejs/kit").RequestEvent) {
 if (!locals.currentShop || !locals.user) {
  return apiUnauthorized("No shop");
 }
 if (!params.id) return apiError("Missing id", 400);

 // Owner/manager only
 const deny = requireRole(locals, ADMIN_ROLES);
 if (deny) return deny;

 const body = await request.json();
 const { amount, destination, notes } = body ?? {};

 if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
  return apiError("amount must be a positive number", 400);
 }
 if (destination && !VALID_DESTINATIONS.includes(destination)) {
  return apiError("Invalid destination", 400);
 }

 const { data, error } = await userClientFromCtx({
  cookies,
  locals,
 } as any).rpc(
  "record_credit_payment" as any,
  {
   p_sale_id: params.id,
   p_amount: amount,
   p_destination: destination ?? DESTINATION.COUNTER,
   p_actor_id: locals.user.id,
   p_notes: notes ?? null,
  } as any,
 );
 if (error) return apiError(error.message, 400);

 // data is the updated sale row
 return apiOk(data);
}
