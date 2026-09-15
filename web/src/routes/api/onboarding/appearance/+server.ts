import { json } from "@sveltejs/kit";
import { userClientFromCtx } from "$lib/server/supabase";
import { appearanceSchema } from "$lib/validators/schemas";
import { parseBody } from "$lib/validators/parseBody";
import { apiError, apiUnauthorized } from "$lib/server/apiResponse";

/**
 * POST /api/onboarding/appearance — save theme/colors.
 * Advances to the 'team' step.
 */
export async function POST({
  cookies,
  request,
  locals,
}: import("@sveltejs/kit").RequestEvent) {
  if (!locals.currentShop) return apiUnauthorized("No shop context");

  const parsed = await parseBody(request, appearanceSchema);
  if (!parsed.ok) return parsed.response;
  const { primary_color, sidebar_bg, theme, palette_id } = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = userClientFromCtx({ cookies, locals } as any);

  const update: Record<string, unknown> = {
    primary_color,
    sidebar_bg,
    theme,
    onboarding_step: "team",
  };
  if (palette_id) update.palette_id = palette_id;

  const { error } = await supabase
    .from("shops")
    .update(update)
    .eq("id", locals.currentShop.id);

  if (error) return apiError(error.message, 400);
  return json({ ok: true });
}
