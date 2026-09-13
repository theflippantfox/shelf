<script lang="ts">
  import { auth }        from '$lib/stores/auth.svelte';
  import { currentShop } from '$lib/stores/shop.svelte';
  import { theme }       from '$lib/stores/theme.svelte';
  import { inventory as invStore } from '$lib/stores/inventory.svelte';
  import { customers as custStore } from '$lib/stores/customers.svelte';
  import { offlineSync } from '$lib/offline/offlineSync.svelte';
  import { subscribeToRealtime, unsubscribeFromRealtime } from '$lib/offline/realtime';
  import Sidebar           from '$lib/components/layout/Sidebar.svelte';
  import BottomNav         from '$lib/components/layout/BottomNav.svelte';
  import Header            from '$lib/components/layout/Header.svelte';
  import Toast             from '$lib/components/ui/Toast.svelte';
  import OfflineIndicator  from '$lib/components/ui/OfflineIndicator.svelte';
  import TopProgress       from '$lib/components/ui/TopProgress.svelte';
  import CommandBar        from '$lib/components/CommandBar.svelte';
  import { onMount }       from 'svelte';
import { readAnalyticsCache, writeAnalyticsCache, buildAnalyticsCacheKey } from '$lib/offline/offlineFetch';

  let { data, children } = $props();

  $effect.pre(() => {
    auth.init(data.user as any, data.shopMember as any);
    currentShop.init(data.currentShop as any);

    if (data.currentShop) {
      theme.init(
        (data.currentShop as any).theme ?? 'system',
        (data.currentShop as any).palette_id ?? undefined,
      );
    }
  });

  // Hydrate the inventory + customers stores from the layout's
  // server-loaded data. $effect.pre runs both on the server and
  // on the client (it runs before the page renders), so the
  // dashboard's "Inventory alerts" KPI and "Out of stock" / "Low
  // stock" lists are correct on the very first render AND they
  // stay in sync with the latest server payload on client-side
  // navigation between pages.
  $effect.pre(() => {
    if (data.allProducts) invStore.replaceAll(data.allProducts as any[]);
    if (data.customers)  custStore.replaceAll(data.customers  as any[]);
  });

  // Offline-first hydration: populate stores from IndexedDB before
  // server payload lands, so offline users see data immediately.
  $effect(() => {
    void invStore.hydrateFromCache();
    void custStore.hydrateFromCache();

    let lastSync = offlineSync.lastSyncAt;
    const poll = setInterval(() => {
      if (offlineSync.lastSyncAt !== lastSync) {
        lastSync = offlineSync.lastSyncAt;
        void invStore.hydrateFromCache();
        void custStore.hydrateFromCache();
      }
    }, 2000);
    return () => clearInterval(poll);
  });

  $effect(() => {
    void offlineSync.flushPendingSales();
    void offlineSync.flushPendingOps();
    void offlineSync.refreshAllCaches();
  });

  // ── Realtime subscriptions ────────────────────────────────────────────
  $effect(() => {
    const shop = currentShop.data;
    if (!shop) return;

    subscribeToRealtime();
    return () => unsubscribeFromRealtime();
  });

  let cmdOpen   = $state(false);
  let products  = $state<any[]>([]);

  onMount(async () => {
    try {
      const res = await fetch('/api/products?limit=20');
      if (res.ok) {
        const d = await res.json();
        products = d.products ?? d ?? [];
      }
    } catch { /* offline or auth not yet ready */ }

    try {
      const res = await fetch('/api/auth/my-shops');
      if (res.ok) {
        const shops = await res.json();
        currentShop.setAllShops(shops);
      }
    } catch { /* offline */ }

    // Pre-warm analytics cache.
    const cacheKey = buildAnalyticsCacheKey('?period=30d');
    readAnalyticsCache(cacheKey).then((cached) => {
      if (!cached) {
        fetch('/api/analytics?period=30d')
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => { if (json?.analytics) writeAnalyticsCache(cacheKey, json); })
          .catch(() => {});
      }
    });
  });
</script>

<svelte:head><title>Shëlf</title></svelte:head>
<Sidebar />
<TopProgress />
<div class="app-main min-h-screen flex flex-col">
  <Header onOpenCommandBar={() => (cmdOpen = true)} />
  <main class="page-shell flex-1">
    {@render children()}
  </main>
  <BottomNav />
</div>
<Toast />
<OfflineIndicator />
<CommandBar bind:open={cmdOpen} {products} />
