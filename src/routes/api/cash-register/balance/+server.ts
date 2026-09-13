/**
 * /api/cash-register/balance — get current per-destination balance.
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError } from "$lib/server/apiResponse";

export async function GET({
  cookies,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ destinations: [], total: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase.rpc("get_register_balance", {
    p_shop_id: locals.currentShop.id,
  });
  if (error) return apiError(error.message);

  const destinations = (data ?? []).map((r: any) => ({
    destination: r.destination,
    balance: Number(r.balance),
  }));
  const total = destinations.reduce((s: number, d: any) => s + d.balance, 0);
  return json({ destinations, total });
}
