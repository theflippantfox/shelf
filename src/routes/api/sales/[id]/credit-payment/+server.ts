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

export async function POST({
 cookies,
 params,
 request,
 locals,
}: import("@sveltejs/kit").RequestEvent) {
 if (!locals.currentShop || !locals.user) {
  return json({ error: "No shop" }, { status: 401 });
 }
 if (!params.id) return json({ error: "Missing id" }, { status: 400 });

 // Owner/manager only
 const deny = requireRole(locals, ["owner", "manager"]);
 if (deny) return deny;

 const body = await request.json();
 const { amount, destination, notes } = body ?? {};

 if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
  return json({ error: "amount must be a positive number" }, { status: 400 });
 }
 if (destination && !["counter", "bank", "other"].includes(destination)) {
  return json({ error: "Invalid destination" }, { status: 400 });
 }

 const { data, error } = await userClientFromCtx({ cookies } as any).rpc(
  "record_credit_payment" as any,
  {
   p_sale_id: params.id,
   p_amount: amount,
   p_destination: destination ?? "counter",
   p_actor_id: locals.user.id,
   p_notes: notes ?? null,
  } as any,
 );
 if (error) return json({ error: error.message }, { status: 400 });

 // data is the updated sale row
 return json(data, { status: 200 });
}
