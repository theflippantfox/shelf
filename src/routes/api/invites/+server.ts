/**
 * /api/invites — invitee side of the team flow.
 *
 * GET: list pending invites for the current user across all shops.
 * POST: accept or decline a specific invite.
 *       body: { shop_member_id, action: 'accept' | 'decline' }
 */
import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { apiError, apiOk, apiUnauthorized } from "$lib/server/apiResponse";
import { MEMBER_STATUS } from "$lib/constants";

export async function GET({
  cookies,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.user) return apiUnauthorized("Not signed in");

  // The user can see their own row even before accepting (RLS update).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies });
  const { data, error } = await supabase
    .from("shop_members")
    .select(`
      id, role, invited_at, shop_id,
      shop:shops!shop_members_shop_id_fkey(id, name, slug),
      inviter:profiles!shop_members_invited_by_fkey(id, first_name, last_name)
    `)
    .eq("user_id", locals.user.id)
    .eq("status", MEMBER_STATUS.INVITED)
    .order("invited_at", { ascending: false });

  if (error) return apiError(error.message);
  return json(data ?? []);
}

export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.user) return apiUnauthorized("Not signed in");

  const { shop_member_id, action } = await request.json();
  if (!shop_member_id || !action)
    return apiError("shop_member_id and action are required", 400);
  if (action !== "accept" && action !== "decline")
    return apiError('action must be "accept" or "decline"', 400);

  // RLS allows the invitee to update their own row when status='invited',
  // restricting new status to 'active' or 'suspended'.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies });
  const newStatus =
    action === "accept" ? MEMBER_STATUS.ACTIVE : MEMBER_STATUS.SUSPENDED;

  const { data, error } = await supabase
    .from("shop_members")
    .update({ status: newStatus })
    .eq("id", shop_member_id)
    .eq("user_id", locals.user.id) // belt-and-suspenders: only own row
    .eq("status", MEMBER_STATUS.INVITED) // can't act on already-accepted
    .select(`
      id, role, status, shop_id,
      shop:shops!shop_members_shop_id_fkey(id, name, slug)
    `)
    .single();

  if (error) return apiError(error.message, 400);
  return apiOk(data);
}
