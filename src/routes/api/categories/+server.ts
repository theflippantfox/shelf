import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { categoryCreateSchema } from "$lib/validators/schemas";

/**
 * GET /api/categories — list categories for the current shop.
 */
export async function GET({
  cookies,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json([]);
  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("shop_id", locals.currentShop.id)
    .is("archived_at", null)
    .order("sort_order")
    .order("name");

  if (error) return json({ error: error.message }, { status: 500 });
  return json(data ?? []);
}

/**
 * POST /api/categories — create a category.
 * Only accepts whitelisted fields to prevent mass-assignment.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, categoryCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, icon, color, sort_order } = parsed.data;

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      icon,
      color,
      sort_order: sort_order ?? 0,
      shop_id: locals.currentShop.id,
    } as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data, { status: 201 });
}
