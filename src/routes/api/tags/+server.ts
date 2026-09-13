import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { tagCreateSchema } from "$lib/validators/schemas";

/**
 * GET /api/tags — list tags for the current shop.
 */
export async function GET({
  cookies,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json([]);
  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("shop_id", locals.currentShop.id)
    .order("name");

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data ?? []);
}

/**
 * POST /api/tags — create a tag.
 * Only accepts whitelisted fields to prevent mass-assignment.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, tagCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, color } = parsed.data;

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("tags")
    .insert({
      name,
      color: color ?? null,
      shop_id: locals.currentShop.id,
    } as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data, { status: 201 });
}
