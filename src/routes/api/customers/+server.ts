import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { parseBody } from "$lib/validators/parseBody";
import { customerCreateSchema } from "$lib/validators/schemas";

/**
 * GET /api/customers — list for current shop, with optional search.
 */
export async function GET({
  cookies,
  locals,
  url,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });
  const search = url.searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = userClientFromCtx({ cookies } as any);

  let q = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("shop_id", locals.currentShop.id)
    .order("name")
    .range(from, to);

  if (search) {
    q = q.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await q;
  if (error) return json({ error: error.message }, { status: 500 });
  return json({
    data: data ?? [],
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/**
 * POST /api/customers — create a customer.
 * Only accepts whitelisted fields to prevent mass-assignment.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return json({ error: "No shop" }, { status: 401 });

  const parsed = await parseBody(request, customerCreateSchema);
  if (!parsed.ok) return parsed.response;
  const { name, phone, email, notes } = parsed.data;

  const supabase = userClientFromCtx({ cookies } as any);
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      phone: phone ?? null,
      email: email ?? null,
      notes: notes ?? null,
      shop_id: locals.currentShop.id,
    } as any)
    .select()
    .single();

  if (error) return json({ error: error.message }, { status: 400 });
  return json(data, { status: 201 });
}
