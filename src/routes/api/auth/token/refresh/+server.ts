/**
 * POST /api/auth/token/refresh — Refresh an expired access token.
 *
 * Accepts a refresh_token and returns new session tokens.
 */
import { json } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";

export async function POST({ request }: { request: Request }) {
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
