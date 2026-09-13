import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { supplierCreateSchema } from "$lib/validators/schemas";

/**
 * GET /api/suppliers — list (active, with search filter) and create.
 */
export async function GET({
  cookies,
  locals,
  url,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });
  const search = url.searchParams.get("search") ?? "";

  const supabase = userClientFromCtx({ cookies } as any);
  let q = supabase
    .from("suppliers")
    .select("*")
    .eq("shop_id", locals.currentShop.id)
    .eq("is_active", true)
    .order("name");

  if (search) q = q.ilike("name", `%${search}%`);

  const { data, error } = await q;
  if (error) return json({ error: error.message }, { status: 500 });
  return json(data ?? []);
}

/**
 * POST /api/suppliers — create a supplier.
 * Only accepts whitelisted fields to prevent mass-assignment.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, supplierCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, contact_name, phone, email, address, notes } = parsed.data;

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      contact_name: contact_name ?? null,
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      notes: notes ?? null,
      shop_id: locals.currentShop.id,
    } as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data, { status: 201 });
}
