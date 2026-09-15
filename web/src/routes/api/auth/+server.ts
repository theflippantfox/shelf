/**
 * POST /api/auth        — login
 * DELETE /api/auth      — logout
 *
 * Login is done via the anon-key Supabase client (which sets the auth cookie
 * via @supabase/ssr). We deliberately use a fresh client (not userClient)
 * so the cookie write happens on this request's cookie jar.
 */
import { json } from "@sveltejs/kit";
import { createServerClient } from "@supabase/ssr";
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";
import { loginSchema } from "$lib/validators/schemas";
import { parseBody } from "$lib/validators/parseBody";
import { apiError } from "$lib/server/apiResponse";

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false, // local dev; set true behind HTTPS
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function makeAuthClient(cookies: import("@sveltejs/kit").Cookies) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (settable) => {
        for (const { name, value, options } of settable) {
          cookies.set(name, value, { ...COOKIE_OPTS, ...options });
        }
      },
    },
  });
}

export async function POST({
  request,
  cookies,
}: import("@sveltejs/kit").RequestEvent) {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  try {
    const supabase = makeAuthClient(cookies);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      return apiError("Invalid email or password", 401);
    }
    return json({ ok: true, userId: data.user.id });
  } catch (err) {
    console.error("[auth login]", err);
    return apiError("Login failed — please try again", 500);
  }
}

export async function DELETE({
  cookies,
}: import("@sveltejs/kit").RequestEvent) {
  try {
    const supabase = makeAuthClient(cookies);
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth logout]", err);
  }
  // Cookie is cleared by signOut via setAll; belt-and-braces also clear any
  // Supabase cookies we know about.
  cookies.delete("sb-127-auth-token", { path: "/" });
  cookies.delete("shelf-current-shop", { path: "/" });
  return json({ ok: true });
}
