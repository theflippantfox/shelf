import type { Handle } from "@sveltejs/kit";
import {
  userClient,
  userClientFromToken,
  adminClient,
} from "$lib/server/supabase";
import { getActiveMembership } from "$lib/server/auth";

const SHOP_COOKIE = "shelf-current-shop";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  event.locals.shopMember = null;
  event.locals.currentShop = null;

  // 1. Resolve auth user — check Bearer token first, then cookies
  const authHeader = event.request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  let supabase;
  if (bearerToken) {
    // Token-based auth (Flutter app / API clients)
    supabase = userClientFromToken(bearerToken);
  } else {
    // Cookie-based auth (browser / web app)
    supabase = userClient(event);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 2. Load the user's active shop membership
    // API clients send x-shop-id header; web uses the shelf-current-shop cookie.
    const shopIdHint =
      event.request.headers.get("x-shop-id") ?? event.cookies.get(SHOP_COOKIE);
    try {
      // Always load the profile so locals.user is non-null for any signed-in user.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin: any = adminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        event.locals.user = profile;
      }

      const ctx = profile
        ? await getActiveMembership(user.id, shopIdHint)
        : null;
      if (ctx) {
        event.locals.shopMember = ctx.member;
        event.locals.currentShop = ctx.shop;

        // 3. Persist the shop cookie for web clients (not API clients)
        if (!shopIdHint && !bearerToken) {
          event.cookies.set(SHOP_COOKIE, ctx.shop.id, {
            httpOnly: false,
            path: "/",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
          });
        }
      }
    } catch (memErr) {
      console.error("[hooks] membership lookup failed:", memErr);
    }
  }

  return resolve(event);
};
