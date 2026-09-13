/**
 * /api/cash-register/[id] — void a manual entry.
 *
 * Only manual entries can be voided via this path. Sale entries go
 * through void_sale() (which handles the paired register writes).
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { requireRole } from "$lib/server/auth";
import { ADMIN_ROLES } from "$lib/constants";
import { apiError, apiUnauthorized } from "$lib/server/apiResponse";

export async function PATCH({
 cookies,
 params,
 request,
 locals,
}: import("@sveltejs/kit").RequestEvent) {
 if (!locals.currentShop || !locals.user) {
  return apiUnauthorized("No shop");
 }
 if (!params.id) return apiError("Missing id", 400);

 // Owner/manager only — voiding is a privileged op
 const deny = requireRole(locals, ADMIN_ROLES);
 if (deny) return deny;

 const body = await request.json();
 const reason = (body?.void_reason ?? "").toString();
 if (!reason.trim()) return apiError("void_reason is required", 400);

 const { error } = await userClientFromCtx({ cookies } as any).rpc(
  "void_register_entry" as any,
  {
   p_entry_id: params.id,
   p_actor_id: locals.user.id,
   p_reason: reason,
  } as any,
 );
 if (error) return apiError(error.message, 400);
 return json({ ok: true });
}
