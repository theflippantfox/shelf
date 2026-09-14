/**
 * POST /api/auth/token — Issue a session token for API clients (e.g. Flutter app).
 *
 * Accepts email + password, authenticates via Supabase Auth, and returns
 * the session tokens (access_token, refresh_token, expires_in, user).
 *
 * The client stores these and sends them as:
 *   Authorization: Bearer <access_token>
 *
 * The hooks.server.ts middleware detects this header and creates a
 * Supabase client from the token instead of cookies.
 */
import { json } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { loginSchema } from "$lib/validators/schemas";
import { parseBody } from "$lib/validators/parseBody";
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";

export async function POST({ request }: { request: Request }) {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;
  const { email, password } = parsed.data;

  // Use a plain Supabase client (no cookies) to get a bearer token
  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return json({ error: "Invalid email or password" }, { status: 401 });
  }

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}

/**
 * POST /api/auth/token/refresh — Refresh an expired access token.
 *
 * Accepts a refresh_token and returns new session tokens.
 */
export async function POST_refresh({ request }: { request: Request }) {
  let body: { refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.refresh_token) {
    return json({ error: "refresh_token is required" }, { status: 400 });
  }

  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: body.refresh_token,
  });

  if (error || !data.session) {
    return json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
  });
}
