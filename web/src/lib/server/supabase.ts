/**
 * Supabase client factory for Shëlf server-side code.
 *
 * Two clients:
 *
 * - `adminClient()`  — service-role key, bypasses RLS. Use ONLY for:
 *     • auth.admin.* calls (createUser, inviteUserByEmail, generateLink, etc.)
 *     • system operations triggered by trusted server code (signup, team invites)
 *   Never expose to the browser. Never use for ordinary reads/writes.
 *
 * - `userClient(event)` — anon key, RLS-enforced. Use this for all normal
 *   reads/writes from API routes — the JWT in event.cookies determines the
 *   auth.uid() that RLS policies see.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Cookies, RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import {
   PUBLIC_SUPABASE_URL,
   PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";
import type { Database } from "$lib/types/db";

// Custom header set by API clients (Flutter app) to select the active shop.
const SHOP_HEADER = "x-shop-id";
const SHOP_COOKIE = "shelf-current-shop";

/**
 * Service-role client — bypasses RLS. Use for auth.admin.* only.
 */
export function adminClient(): SupabaseClient<Database> {
   return createClient<Database>(
      PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
         auth: {
            persistSession: false,
            autoRefreshToken: false,
         },
      },
   );
}

/**
 * User-scoped client — RLS-enforced. Reads/writes respect the JWT in event.cookies.
 *
 * Pass a SvelteKit RequestEvent so the cookie helpers can read/write session cookies.
 */
export function userClient(event: RequestEvent): SupabaseClient<Database> {
   if (event.locals?.bearerToken) {
      return userClientFromToken(event.locals.bearerToken);
   }
   return createServerClient<Database>(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
         cookies: {
            getAll: () => event.cookies.getAll(),
            setAll: (cookies) => {
               for (const { name, value, options } of cookies) {
                  event.cookies.set(name, value, { path: "/", ...options });
               }
            },
         },
      },
   );
}

/**
 * User-scoped client for `+server.ts` API routes that don't have a full
 * RequestEvent in scope (e.g. when the handler destructures only some fields).
 *
 * Pass `{ cookies, locals }` (or any object with a `cookies.getAll()`).
 * When a bearerToken is present in locals (Flutter/API clients), creates a
 * token-based client instead of cookie-based — this avoids the need for
 * Supabase session cookies which API clients don't have.
 */
export function userClientFromCtx(ctx: {
   cookies: Cookies;
   bearerToken?: string | null;
   locals?: any;
}): SupabaseClient<Database> {
   // If bearer token is available, use token-based auth (Flutter / API clients)
   const token = ctx.bearerToken || ctx.locals?.bearerToken;
   if (token) {
      return userClientFromToken(token);
   }
   // Otherwise, fall back to cookie-based auth (browser / web app)
   return createServerClient<Database>(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
         cookies: {
            getAll: () => ctx.cookies.getAll(),
            setAll: (cookies) => {
               if (typeof ctx.cookies.set !== "function") return;
               for (const { name, value, options } of cookies) {
                  ctx.cookies.set!(name, value, { path: "/", ...options });
               }
            },
         },
      },
   );
}

/**
 * User-scoped client from a Bearer token (for API clients like the Flutter app).
 *
 * Creates a Supabase client that uses the provided JWT for auth instead of cookies.
 * RLS policies work the same way — auth.uid() is extracted from the JWT.
 */
export function userClientFromToken(token: string): SupabaseClient<Database> {
   return createClient<Database>(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY,
      {
         global: {
            headers: {
               Authorization: `Bearer ${token}`,
            },
         },
         auth: {
            persistSession: false,
            autoRefreshToken: false,
         },
      },
   );
}

/**
 * Resolve the shop ID from a request event.
 * Checks the x-shop-id header first (API clients), then the shelf-current-shop cookie (web).
 */
export function resolveShopId(event: RequestEvent): string | null {
   return (
      event.request.headers.get(SHOP_HEADER) ??
      event.cookies.get(SHOP_COOKIE) ??
      null
   );
}
