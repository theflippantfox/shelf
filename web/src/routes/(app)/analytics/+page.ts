/**
 * Universal load for the analytics page.
 *
 * On the server (SSR), this is a no-op — the +page.server.ts handles metadata.
 *
 * On the client, this reads cached analytics from IndexedDB so the
 * page renders instantly from cache, then fresh data is fetched
 * client-side and updates the display.
 */
import { browser } from "$app/environment";
import {
 readAnalyticsCache,
 buildAnalyticsCacheKey,
} from "$lib/offline/offlineFetch";

export async function load({ url }: { url: URL }) {
 if (!browser) return {};

 const cacheKey = buildAnalyticsCacheKey(url.search);
 const cached = await readAnalyticsCache(cacheKey);
 if (cached) {
  return { analytics: cached.analytics, pnl: cached.pnl, _fromCache: true };
 }
 return {};
}
