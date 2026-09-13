/**
 * /api/users/[id] — single member management.
 *
 * PATCH: update role / permissions. Owner only.
 * DELETE: soft-suspend an active member, OR cancel a pending invite.
 *         Owner only.
 */
import { json } from "@sveltejs/kit";
import { adminClient, userClientFromCtx } from "$lib/server/supabase";
import {
  apiError,
  apiForbidden,
  apiNotFound,
  apiUnauthorized,
} from "$lib/server/apiResponse";

export async function PATCH({
  cookies,
  params,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");
  if (locals.shopMember?.role !== "owner")
    return apiForbidden("Only owners can update team members");

  const body = await request.json();
  const ALLOWED = ["role", "status", "permissions"];
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.includes(k)) safe[k] = v;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("shop_members")
    .update(safe)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return apiError(error.message, 400);
  return json(data);
}

export async function DELETE({
  params,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!params.id) return apiError("Missing id", 400);
  if (!locals.currentShop) return apiUnauthorized("No shop");
  if (locals.shopMember?.role !== "owner")
    return apiForbidden("Only owners can remove team members");

  // Look up the row to decide cancel-vs-suspend.
  // Use admin to bypass any RLS quirks (we already owner-gated above).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = adminClient();
  const { data: row, error: lookupErr } = await admin
    .from("shop_members")
    .select("id, status")
    .eq("id", params.id)
    .single();
  if (lookupErr || !row) return apiNotFound("Member");

  // Invited: hard-delete (so the email can be re-invited cleanly).
  if ((row as any).status === "invited") {
    const { error: delErr } = await admin
      .from("shop_members")
      .delete()
      .eq("id", params.id);
    if (delErr) return apiError(delErr.message, 400);
    return json({ cancelled: true });
  }

  // Active: soft-suspend.
  const { data, error } = await admin
    .from("shop_members")
    .update({ status: "suspended" })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return apiError(error.message, 400);
  return json(data);
}
