<script lang="ts">
  import { formatCurrency, formatCurrencyCompact, formatDateTime } from '$lib/utils/format';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { page as pageState } from '$app/state';
  import AreaChart from '$lib/components/charts/AreaChart.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import Heatmap from '$lib/components/charts/Heatmap.svelte';
  import DynamicIcon from '$lib/components/ui/DynamicIcon.svelte';
  import PeriodSelector from '$lib/components/analytics/PeriodSelector.svelte';
  import TrendBadge from '$lib/components/analytics/TrendBadge.svelte';
  import MarginBadge from '$lib/components/analytics/MarginBadge.svelte';
  import {
    TrendingUp, BarChart3, ShoppingCart,
    Calendar, Banknote, Activity,
    Search, ArrowUpDown, ChevronLeft, ChevronRight,
    FileText, Receipt, Clock, Percent,
  } from 'lucide-svelte';
  import {
    readAnalyticsCache, writeAnalyticsCache,
    buildAnalyticsCacheKey,
  } from '$lib/offline/offlineFetch';

  let { data: _data } = $props();

  /* ── state ─────────────────────────────────────────────────────────── */
  let activeTab = $state<'overview' | 'pnl'>('overview');
  let analytics = $state<any>(null);
  let pnl = $state<any>(null);
  let currentSearch = $state('');

  let pnlTab = $state<'calendar' | 'report' | 'bills'>('calendar');
  let expandedDate = $state<string | null>(null);
  let billSearch = $state('');
  let billSortKey = $state<'date' | 'revenue' | 'cogs' | 'profit' | 'margin'>('date');
  let billSortDir = $state<'asc' | 'desc'>('desc');
  let billPage = $state(0);
  const BILL_PAGE_SIZE = 50;

  const presets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7 days', value: '7d' },
    { label: '30 days', value: '30d' },
    { label: '90 days', value: '90d' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Year', value: 'this_year' },
  ];

  const metricTabs = [
    { key: 'revenue', label: 'Revenue', icon: 'TrendingUp' },
    { key: 'transactions', label: 'Transactions', icon: 'ShoppingBag' },
    { key: 'avgOrder', label: 'Avg Order', icon: 'BarChart3' },
  ] as const;
  type MetricKey = (typeof metricTabs)[number]['key'];
  let activeMetric = $state<MetricKey>('revenue');

  /* ── data fetching ─────────────────────────────────────────────────── */
  async function loadAnalytics(search: string) {
    const cacheKey = buildAnalyticsCacheKey(search);
    readAnalyticsCache(cacheKey).then((cached: any) => {
      if (cached?.analytics && !analytics) analytics = cached.analytics;
    });
    fetch(`/api/analytics${search}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.analytics) { analytics = json.analytics; writeAnalyticsCache(cacheKey, json); }
      })
      .catch(() => {});
  }

  async function loadPnl(search: string) {
    fetch(`/api/analytics/pnl${search}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (json?.pnl) pnl = json.pnl; })
      .catch(() => {});
  }

  if (browser) {
    onMount(() => {
      currentSearch = window.location.search;
      loadAnalytics(currentSearch);
      if (activeTab === 'pnl') loadPnl(currentSearch);
    });
  }

  function changePeriod(preset: string) {
    const search = `?period=${preset}${activeTab === 'pnl' ? `&tab=${pnlTab}` : ''}`;
    currentSearch = search;
    goto(search, { replaceState: true, invalidateAll: false });
    if (browser) { loadAnalytics(search); if (activeTab === 'pnl') loadPnl(search); }
  }

  function switchTab(tab: 'overview' | 'pnl') {
    activeTab = tab;
    if (tab === 'pnl' && !pnl) loadPnl(currentSearch);
  }

  function switchPnlTab(tab: 'calendar' | 'report' | 'bills') {
    pnlTab = tab;
    const u = new URL(pageState.url);
    u.searchParams.set('tab', tab);
    goto(u.toString(), { replaceState: true, invalidateAll: false });
    if (!pnl) loadPnl(currentSearch);
  }

  function navMonth(dir: -1 | 1) {
    const [y, m] = (pnl?.calendarMonth ?? '').split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    const mm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const search = `${currentSearch.includes('?') ? '&' : '?'}month=${mm}&tab=${pnlTab}`;
    loadPnl(search);
  }

  /* ── overview derived ──────────────────────────────────────────────── */
  const kpis = $derived(analytics?.kpis ?? null);
  const trend = $derived(analytics?.trend ?? []);
  const period = $derived(analytics?.period ?? null);
  const grossProfit = $derived(analytics?.grossProfit ?? null);
  const stockValue = $derived(analytics?.stockValue ?? null);
  const monthlyTrend = $derived(analytics?.monthlyTrend ?? []);
  const calendar = $derived(analytics?.calendar ?? null);
  const paymentRows = $derived(analytics?.paymentMethods ?? []);
  const customerTiers = $derived(analytics?.customers?.tiers);
  const leaderboard = $derived(analytics?.customers?.leaderboard ?? []);
  const uniqueBuyers = $derived(analytics?.customers?.uniqueBuyers ?? 0);

  const trendLabels = $derived(trend.map((t: any) => t.label));
  const trendDatasets = $derived(
    activeMetric === 'revenue'
      ? [{ label: 'Revenue', data: trend.map((t: any) => t.current ?? 0) }]
      : [{
          label: activeMetric === 'transactions' ? 'Transactions' : 'Avg Order',
          data: trend.map((t: any) => activeMetric === 'transactions' ? (t.txns ?? 0) : (t.avgOrder ?? 0)),
        }],
  );

  const heatmapValues = $derived(
    (analytics?.heatmap ?? []).map((row: any[]) => row.map((v: number) => v ?? 0)),
  );
  const monthlyWithData = $derived(monthlyTrend.filter((m: any) => (m.revenue ?? 0) > 0));
  const monthlyLabels = $derived(monthlyWithData.map((m: any) => m.label));
  const monthlyRevData = $derived(monthlyWithData.map((m: any) => m.revenue ?? 0));

  /* ── P&L derived ─────────────────────────────────────────────────── */
  const filteredBills = $derived.by(() => {
    const bills = pnl?.bills ?? [];
    const q = billSearch.toLowerCase().trim();
    const filtered = q
      ? bills.filter((b: any) => b.ref.toLowerCase().includes(q) || (b.customer ?? '').toLowerCase().includes(q))
      : bills;
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      switch (billSortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'revenue': cmp = a.revenue - b.revenue; break;
        case 'cogs': cmp = a.cogs - b.cogs; break;
        case 'profit': cmp = a.profit - b.profit; break;
        case 'margin': cmp = a.margin - b.margin; break;
      }
      return billSortDir === 'desc' ? -cmp : cmp;
    });
  });

  const pagedBills = $derived(filteredBills.slice(billPage * BILL_PAGE_SIZE, (billPage + 1) * BILL_PAGE_SIZE));
  const billTotalPages = $derived(Math.ceil(filteredBills.length / BILL_PAGE_SIZE));
  const runningTotal = $derived({
    revenue: filteredBills.reduce((s: number, b: any) => s + b.revenue, 0),
    cogs: filteredBills.reduce((s: number, b: any) => s + b.cogs, 0),
    profit: filteredBills.reduce((s: number, b: any) => s + b.profit, 0),
  });

  function toggleSort(key: typeof billSortKey) {
    if (billSortKey === key) billSortDir = billSortDir === 'desc' ? 'asc' : 'desc';
    else { billSortKey = key; billSortDir = 'desc'; }
    billPage = 0;
  }

  function profitColor(profit: number, max: number): string {
    if (profit === 0) return 'var(--surface2)';
    const intensity = Math.max(18, Math.round((Math.abs(profit) / (max || 1)) * 100));
    return profit > 0
      ? `color-mix(in srgb, var(--teal) ${intensity}%, var(--surface2))`
      : `color-mix(in srgb, var(--crimson) ${intensity}%, var(--surface2))`;
  }
</script>

<svelte:head><title>Analytics · Shëlf</title></svelte:head>

{#if !analytics}
  <!-- LOADING STATE -->
  <div class="flex items-center justify-center h-[60vh]">
    <div class="text-center">
      <div class="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mx-auto mb-4"></div>
      <p class="text-sm font-medium text-[var(--text-2)]">Loading analytics…</p>
    </div>
  </div>
{:else}
  {@const hasData = (kpis?.transactions?.current ?? 0) > 0 || (kpis?.revenue?.current ?? 0) > 0}

  <!-- EMPTY STATE -->
  {#if !hasData}
    <div class="flex items-center justify-center h-[60vh]">
      <div class="text-center max-w-sm">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
             style="background: color-mix(in srgb, var(--primary) 8%, transparent);">
          <BarChart3 size={32} strokeWidth={1.5} style="color:var(--primary)" />
        </div>
        <h2 class="text-lg font-semibold text-[var(--text)] mb-2">No data yet</h2>
        <p class="text-sm text-[var(--text-3)] mb-6">Start ringing up sales to see your revenue, profit, and trends here.</p>
        <a href="/sale" class="btn btn-primary">
          <ShoppingCart size={16} strokeWidth={2} /> Make your first sale
        </a>
      </div>
    </div>
  {:else}
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- HEADER                                                            -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-[var(--text)] tracking-tight">Analytics</h1>
        <div class="inline-flex bg-[var(--surface2)] rounded-lg p-0.5">
          <button
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            style="background:{activeTab === 'overview' ? 'var(--bg)' : 'transparent'}; color:{activeTab === 'overview' ? 'var(--text)' : 'var(--text-3)'}; box-shadow:{activeTab === 'overview' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'}"
            onclick={() => switchTab('overview')}
          >Overview</button>
          <button
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            style="background:{activeTab === 'pnl' ? 'var(--bg)' : 'transparent'}; color:{activeTab === 'pnl' ? 'var(--text)' : 'var(--text-3)'}; box-shadow:{activeTab === 'pnl' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'}"
            onclick={() => switchTab('pnl')}
          >P&L Report</button>
        </div>
      </div>
      <PeriodSelector {presets} active={period?.preset ?? '30d'} onchange={changePeriod} />
    </header>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- OVERVIEW TAB                                                      -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if activeTab === 'overview'}
      <div class="space-y-5">

        <!-- ── KPI ROW ──────────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <!-- Revenue -->
          <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                   style="background:color-mix(in srgb, var(--primary) 10%, transparent)">
                <TrendingUp size={16} strokeWidth={2} style="color:var(--primary)" />
              </div>
              <span class="text-xs font-medium text-[var(--text-3)]">Revenue</span>
            </div>
            <p class="text-2xl font-bold tabular-nums text-[var(--text)]">{formatCurrencyCompact(kpis.revenue.current)}</p>
            {#if kpis.revenue.delta?.pct}
              <div class="mt-1">
                <TrendBadge direction={kpis.revenue.delta.direction} label={`${Math.abs(kpis.revenue.delta.pct)}%`} />
              </div>
            {/if}
          </div>

          <!-- Transactions -->
          <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                   style="background:color-mix(in srgb, var(--cobalt) 10%, transparent)">
                <Activity size={16} strokeWidth={2} style="color:var(--cobalt)" />
              </div>
              <span class="text-xs font-medium text-[var(--text-3)]">Transactions</span>
            </div>
            <p class="text-2xl font-bold tabular-nums text-[var(--text)]">{kpis.transactions.current.toLocaleString()}</p>
            {#if kpis.transactions.delta?.pct}
              <div class="mt-1">
                <TrendBadge direction={kpis.transactions.delta.direction} label={`${Math.abs(kpis.transactions.delta.pct)}%`} />
              </div>
            {/if}
          </div>

          <!-- Avg Order -->
          <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                   style="background:color-mix(in srgb, var(--teal) 10%, transparent)">
                <BarChart3 size={16} strokeWidth={2} style="color:var(--teal)" />
              </div>
              <span class="text-xs font-medium text-[var(--text-3)]">Avg Order</span>
            </div>
            <p class="text-2xl font-bold tabular-nums text-[var(--text)]">{formatCurrencyCompact(kpis.avgOrder.current)}</p>
            {#if kpis.avgOrder.delta?.pct}
              <div class="mt-1">
                <TrendBadge direction={kpis.avgOrder.delta.direction} label={`${Math.abs(kpis.avgOrder.delta.pct)}%`} />
              </div>
            {/if}
          </div>

          <!-- Margin -->
          {#if kpis.margin}
            <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                     style="background:color-mix(in srgb, var(--gold) 10%, transparent)">
                  <Percent size={16} strokeWidth={2} style="color:var(--gold)" />
                </div>
                <span class="text-xs font-medium text-[var(--text-3)]">Margin</span>
              </div>
              <p class="text-2xl font-bold tabular-nums text-[var(--text)]">{kpis.margin.current.toFixed(1)}%</p>
              {#if kpis.margin.delta?.pp}
                <div class="mt-1">
                  <TrendBadge direction={kpis.margin.delta.direction} label={`${Math.abs(kpis.margin.delta.pp)}pp`} />
                </div>
              {/if}
            </div>
          {/if}

          <!-- Gross Profit -->
          {#if grossProfit}
            <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                     style="background:color-mix(in srgb, var(--teal) 10%, transparent)">
                  <Banknote size={16} strokeWidth={2} style="color:var(--teal)" />
                </div>
                <span class="text-xs font-medium text-[var(--text-3)]">Gross Profit</span>
              </div>
              <p class="text-2xl font-bold tabular-nums" style="color:{grossProfit.current >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">{formatCurrencyCompact(grossProfit.current)}</p>
              {#if grossProfit.delta?.pct}
                <div class="mt-1">
                  <TrendBadge direction={grossProfit.delta.direction} label={`${Math.abs(grossProfit.delta.pct)}%`} />
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- ── MAIN CHART ROW ──────────────────────────────────────────── -->
        <div class="grid grid-cols-12 gap-5">
          <!-- Revenue Trend (8 cols) -->
          <div class="col-span-12 lg:col-span-8 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-[var(--text)]">
                {activeMetric === 'revenue' ? 'Revenue' : activeMetric === 'transactions' ? 'Transactions' : 'Avg Order'} Trend
              </h2>
              <div class="inline-flex bg-[var(--surface2)] rounded-lg p-0.5">
                {#each metricTabs as tab}
                  {@const active = activeMetric === tab.key}
                  <button
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                    style="background:{active ? 'var(--bg)' : 'transparent'}; color:{active ? 'var(--text)' : 'var(--text-3)'}; box-shadow:{active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'}"
                    onclick={() => (activeMetric = tab.key)}
                  >
                    <DynamicIcon name={tab.icon} size={12} strokeWidth={2} />
                    {tab.label}
                  </button>
                {/each}
              </div>
            </div>
            <div class="h-64">
              <AreaChart labels={trendLabels} datasets={trendDatasets}
                yFormat={activeMetric === 'transactions' ? 'count' : 'currency'} height={256} />
            </div>
          </div>

          <!-- Payment Methods (4 cols) -->
          <div class="col-span-12 lg:col-span-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Payment Methods</h2>
            {#if paymentRows.length === 0}
              <p class="text-sm text-[var(--text-3)] py-12 text-center">No payments</p>
            {:else}
              {@const totalPaymentRev = paymentRows.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)}
              <div class="h-40 mb-4">
                <DonutChart
                  labels={paymentRows.map((pm: any) => pm.label)}
                  data={paymentRows.map((pm: any) => pm.revenue ?? 0)}
                  centerValue={formatCurrency(totalPaymentRev)}
                  centerLabel="total"
                  height={160}
                />
              </div>
              <div class="space-y-2.5">
                {#each paymentRows as pm, i}
                  {@const pct = totalPaymentRev > 0 ? ((pm.revenue / totalPaymentRev) * 100).toFixed(0) : '0'}
                  <div class="flex items-center gap-3">
                    <span class="w-3 h-3 rounded shrink-0"
                          style="background:{['var(--primary)', 'var(--cobalt)', 'var(--gold)', 'var(--rose)', 'var(--crimson)', 'var(--teal)'][i % 6]}"></span>
                    <span class="flex-1 text-sm text-[var(--text-2)]">{pm.label}</span>
                    <span class="text-sm font-semibold tabular-nums">{formatCurrency(pm.revenue)}</span>
                    <span class="text-xs text-[var(--text-3)] w-10 text-right">{pct}%</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- ── SECONDARY ROW ───────────────────────────────────────────── -->
        <div class="grid grid-cols-12 gap-5">
          <!-- 12-Month Trend (8 cols) -->
          <div class="col-span-12 lg:col-span-8 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-[var(--text)]">12-Month Trend</h2>
              <span class="text-xs text-[var(--text-3)]">{monthlyLabels.length} months</span>
            </div>
            <div class="h-48">
              <BarChart labels={monthlyLabels} data={monthlyRevData} color="var(--cobalt)" height={192} yFormat="currency" highlightLast />
            </div>
          </div>

          <!-- Inventory (4 cols) -->
          <div class="col-span-12 lg:col-span-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Inventory</h2>
            {#if stockValue}
              <div class="space-y-4">
                <!-- Retail + Cost side by side -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)] mb-1">Retail</p>
                    <p class="text-xl font-bold tabular-nums text-[var(--text)]">{formatCurrencyCompact(stockValue.retailValue)}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)] mb-1">Cost</p>
                    <p class="text-xl font-bold tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(stockValue.costValue)}</p>
                  </div>
                </div>

                <!-- Units -->
                <div class="flex items-center justify-between py-3 border-y border-[var(--border)]">
                  <span class="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">Units in stock</span>
                  <span class="text-lg font-bold tabular-nums text-[var(--text)]">{stockValue.totalUnits.toLocaleString()}</span>
                </div>

                <!-- Cost vs Margin bar -->
                <div>
                  <div class="flex items-center justify-between text-xs mb-2">
                    <span class="text-[10px] font-medium uppercase tracking-wider text-[var(--text-3)]">Cost vs Margin</span>
                    <div class="flex items-center gap-3">
                      <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-[var(--text-3)]"></span>
                        <span class="text-[10px] text-[var(--text-3)]">Cost {stockValue.retailValue > 0 ? ((stockValue.costValue / stockValue.retailValue) * 100).toFixed(0) : 0}%</span>
                      </span>
                      <span class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full" style="background:var(--cobalt)"></span>
                        <span class="text-[10px] font-semibold" style="color:var(--cobalt-fg)">Margin {stockValue.potentialMargin.toFixed(0)}%</span>
                      </span>
                    </div>
                  </div>
                  <div class="h-3 rounded-full bg-[var(--surface2)] overflow-hidden flex">
                    <div class="h-full transition-all" style="width:{stockValue.retailValue > 0 ? ((stockValue.costValue / stockValue.retailValue) * 100).toFixed(1) : 0}%; background:var(--text-3)"></div>
                    <div class="h-full rounded-r-full transition-all" style="width:{Math.min(100, stockValue.potentialMargin).toFixed(1)}%; background:linear-gradient(90deg, var(--cobalt), color-mix(in srgb, var(--cobalt) 70%, var(--primary)))"></div>
                  </div>
                </div>
              </div>
            {:else}
              <p class="text-sm text-[var(--text-3)] py-8 text-center">No inventory data</p>
            {/if}
          </div>
        </div>

        <!-- ── CALENDAR + BUSIEST TIMES ────────────────────────────────── -->
        <div class="grid grid-cols-12 gap-5">
          <!-- Sales Calendar (4 cols) -->
          <div class="col-span-12 lg:col-span-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5 flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-[var(--text)]">Sales Calendar</h2>
              {#if calendar?.hasData}
                <span class="text-xs text-[var(--text-3)]">{formatCurrencyCompact(calendar.total)} in {calendar.monthLabel}</span>
              {/if}
            </div>

            {#if !calendar}
              <div class="h-48 flex items-center justify-center text-sm text-[var(--text-3)]">No data</div>
            {:else if !calendar.hasData}
              <div class="h-48 flex items-center justify-center text-sm text-[var(--text-3)]">No sales in {calendar.monthLabel}</div>
            {:else}
              {@const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']}
              <div class="grid grid-cols-7 gap-1 text-[10px] text-[var(--text-3)] font-medium text-center mb-1.5">
                {#each dayLabels as l}<div>{l}</div>{/each}
              </div>
              <div class="grid grid-cols-7 gap-1 flex-1" style="grid-template-rows: repeat({calendar.weeks}, 1fr);">
                {#each calendar.cells as c}
                  {#if c.date}
                    {@const v = c.value}
                    {@const intensity = v > 0 ? Math.max(0.18, v / (calendar.max || 1)) : 0}
                    <div class="rounded-md flex items-center justify-center text-[10px] font-semibold tabular-nums transition-transform hover:scale-110 min-h-0
                                {c.isToday ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--bg)]' : ''}"
                         style="background: {c.isFuture ? 'transparent' : v > 0 ? `color-mix(in srgb, var(--teal) ${Math.round(intensity * 100)}%, var(--surface2))` : 'var(--surface2)'};
                                border: {c.isFuture ? '1px dashed var(--border)' : '1px solid transparent'};
                                color: {c.isFuture ? 'var(--text-3)' : v > 0 ? 'white' : 'var(--text-2)'};"
                         title="{c.day} · {c.date}{c.isFuture ? '' : `\n${formatCurrency(v)} · ${c.count} sale${c.count === 1 ? '' : 's'}`}">{c.day}</div>
                  {:else}
                    <div></div>
                  {/if}
                {/each}
              </div>
              <div class="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-3)] mt-2 pt-2 border-t border-[var(--border)]">
                <span>Less</span>
                <div class="flex gap-0.5">
                  {#each [0, 1, 2, 3, 4] as i}
                    <div class="w-2.5 h-2.5 rounded-sm" style="background:color-mix(in srgb, var(--teal) {15 + i * 18}%, var(--surface2))"></div>
                  {/each}
                </div>
                <span>More</span>
              </div>
            {/if}
          </div>

          <!-- Busiest Times (8 cols) -->
          <div class="col-span-12 lg:col-span-8 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-[var(--text)]">Busiest Times</h2>
              <div class="flex items-center gap-1.5 text-[10px] text-[var(--text-3)]">
                <span>Less</span>
                <div class="flex gap-0.5">
                  {#each [0, 1, 2, 3, 4] as i}
                    <div class="w-2.5 h-2.5 rounded-sm" style="background:color-mix(in srgb, var(--primary) {20 + i * 16}%, var(--surface2))"></div>
                  {/each}
                </div>
                <span>More</span>
              </div>
            </div>
            <Heatmap values={heatmapValues} hours={Array.from({ length: 24 }, (_, i) => `${i}`)} fillHeight />
          </div>
        </div>

        <!-- ── TABLES ROW ──────────────────────────────────────────────── -->
        <div class="grid grid-cols-12 gap-5">
          <!-- Top Products (6 cols) -->
          <div class="col-span-12 lg:col-span-6 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Top Products</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[var(--border)]">
                    <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-2">#</th>
                    <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Product</th>
                    <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Revenue</th>
                    <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Units</th>
                    <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {#each analytics.products?.byRevenue ?? [] as product, i}
                    <tr class="border-b border-[var(--border)] last:border-0">
                      <td class="py-3 pr-2">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold"
                              style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">{i + 1}</span>
                      </td>
                      <td class="py-3 pr-4 font-medium text-[var(--text)]">{product.name ?? '—'}</td>
                      <td class="py-3 pr-4 text-right font-semibold tabular-nums">{formatCurrency(product.revenue)}</td>
                      <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{product.units}</td>
                      <td class="py-3 text-right"><MarginBadge value={product.margin} /></td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Categories (6 cols) -->
          {#if (analytics.categories ?? []).length > 0}
            <div class="col-span-12 lg:col-span-6 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
              <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Categories</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-[var(--border)]">
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Category</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Revenue</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Units</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Avg Sale</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each analytics.categories as cat}
                      <tr class="border-b border-[var(--border)] last:border-0">
                        <td class="py-3 pr-4 font-medium text-[var(--text)]">{cat.name}</td>
                        <td class="py-3 pr-4 text-right font-semibold tabular-nums">{formatCurrency(cat.revenue)}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{cat.units}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{formatCurrency(Math.round(cat.revenue / (cat.units || 1)))}</td>
                        <td class="py-3 text-right"><MarginBadge value={cat.margin} /></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>

        <!-- ── CUSTOMERS ROW ───────────────────────────────────────────── -->
        <div class="grid grid-cols-12 gap-5">
          <!-- Customer Tiers (4 cols) -->
          <div class="col-span-12 lg:col-span-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Customers <span class="text-[var(--text-3)] font-normal">({uniqueBuyers})</span></h2>
            <div class="grid grid-cols-3 gap-3">
              <div class="text-center p-3 rounded-lg" style="background:color-mix(in srgb, var(--gold) 8%, transparent)">
                <p class="text-xs font-semibold uppercase tracking-wide mb-1" style="color:var(--gold-fg)">VIP</p>
                <p class="text-2xl font-bold tabular-nums">{customerTiers?.vip ?? 0}</p>
              </div>
              <div class="text-center p-3 rounded-lg" style="background:color-mix(in srgb, var(--primary) 6%, transparent)">
                <p class="text-xs font-semibold uppercase tracking-wide mb-1">Regular</p>
                <p class="text-2xl font-bold tabular-nums">{customerTiers?.regular ?? 0}</p>
              </div>
              <div class="text-center p-3 rounded-lg bg-[var(--surface2)]">
                <p class="text-xs font-semibold uppercase tracking-wide mb-1 text-[var(--text-3)]">New</p>
                <p class="text-2xl font-bold tabular-nums">{customerTiers?.new ?? 0}</p>
              </div>
            </div>
            <p class="text-[11px] text-[var(--text-3)] text-center mt-3">Tiers based on lifetime spend</p>
          </div>

          <!-- Top Customers (8 cols) -->
          <div class="col-span-12 lg:col-span-8 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Top Customers</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[var(--border)]">
                    <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-2">#</th>
                    <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Name</th>
                    <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Spent</th>
                    <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {#each leaderboard as customer, i}
                    <tr class="border-b border-[var(--border)] last:border-0">
                      <td class="py-3 pr-2">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold"
                              style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">{i + 1}</span>
                      </td>
                      <td class="py-3 pr-4 font-medium text-[var(--text)]">{customer.name ?? '—'}</td>
                      <td class="py-3 pr-4 text-right font-semibold tabular-nums">{formatCurrency(customer.spent)}</td>
                      <td class="py-3 text-right tabular-nums text-[var(--text-2)]">{customer.visits}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── OUTSTANDING RECEIVABLES (conditional) ────────────────────── -->
        {#if analytics?.outstanding && analytics.outstanding.total > 0}
          <div class="grid grid-cols-12 gap-5">
            <div class="col-span-12 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
              <div class="flex items-center gap-2 mb-4">
                <Clock size={16} strokeWidth={2} style="color:var(--gold)" />
                <h2 class="text-sm font-semibold text-[var(--text)]">Payment Due</h2>
                <span class="ml-auto text-lg font-bold tabular-nums" style="color:var(--gold-fg)">{formatCurrencyCompact(analytics.outstanding.total)}</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]">
                  <span class="text-sm text-[var(--text-2)]">Pending</span>
                  <span class="text-sm font-semibold tabular-nums">{formatCurrencyCompact(analytics.outstanding.byStatus.pending ?? 0)}</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]">
                  <span class="text-sm text-[var(--text-2)]">Partial</span>
                  <span class="text-sm font-semibold tabular-nums">{formatCurrencyCompact(analytics.outstanding.byStatus.partial ?? 0)}</span>
                </div>
                <div class="p-3 rounded-lg bg-[var(--surface2)]">
                  {#if analytics.outstanding.byCustomer.length > 0}
                    <ul class="space-y-1.5">
                      {#each analytics.outstanding.byCustomer.slice(0, 3) as c (c.id)}
                        <li class="flex items-center justify-between text-sm">
                          <a href="/customers/{c.id}" class="font-medium text-[var(--text)] hover:text-[var(--primary)] truncate">{c.name}</a>
                          <span class="font-semibold tabular-nums whitespace-nowrap" style="color:var(--gold-fg)">{formatCurrencyCompact(c.outstanding)}</span>
                        </li>
                      {/each}
                    </ul>
                  {:else}
                    <span class="text-sm text-[var(--text-3)]">No outstanding payments</span>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/if}

      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- P&L TAB                                                           -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if activeTab === 'pnl'}
      <div class="space-y-5">
        <!-- P&L sub-tabs -->
        <div class="inline-flex bg-[var(--surface2)] rounded-lg p-0.5">
          {#each [{ key: 'calendar', label: 'Calendar', icon: Calendar }, { key: 'report', label: 'Report', icon: FileText }, { key: 'bills', label: 'Bill-by-Bill', icon: Receipt }] as t}
            {@const active = pnlTab === t.key}
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all"
              style="background:{active ? 'var(--bg)' : 'transparent'}; color:{active ? 'var(--text)' : 'var(--text-3)'}; box-shadow:{active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'}"
              onclick={() => switchPnlTab(t.key as 'calendar' | 'report' | 'bills')}
            >
              <t.icon size={14} strokeWidth={2} />
              {t.label}
            </button>
          {/each}
        </div>

        {#if !pnl}
          <div class="flex items-center justify-center h-64">
            <div class="text-center">
              <div class="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mx-auto mb-3"></div>
              <p class="text-sm text-[var(--text-2)]">Loading P&L data…</p>
            </div>
          </div>
        {/if}

        <!-- ── P&L CALENDAR ────────────────────────────────────────────── -->
        {#if pnl && pnlTab === 'calendar'}
          {@const cal = pnl.profitCalendar}
          <div class="grid grid-cols-12 gap-5">
            <div class="col-span-12 lg:col-span-7 bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
              <div class="flex items-center justify-between mb-4">
                <button class="btn btn-sm btn-secondary" onclick={() => navMonth(-1)}>
                  <ChevronLeft size={14} /> Prev
                </button>
                <h2 class="text-base font-semibold text-[var(--text)]">{cal.monthLabel}</h2>
                <button class="btn btn-sm btn-secondary" onclick={() => navMonth(1)}>
                  Next <ChevronRight size={14} />
                </button>
              </div>

              {#if !cal.hasData}
                <div class="h-48 flex items-center justify-center text-sm text-[var(--text-3)]">No sales data for {cal.monthLabel}</div>
              {:else}
                {@const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']}
                <div class="grid grid-cols-7 gap-1 text-[10px] text-[var(--text-3)] font-medium text-center mb-1">
                  {#each dayLabels as l}<div>{l}</div>{/each}
                </div>
                <div class="grid grid-cols-7 gap-1" style="grid-template-rows: repeat({cal.weeks}, minmax(0, 1fr));">
                  {#each cal.cells as c}
                    {#if c.date}
                      <button
                        class="rounded-md flex flex-col items-center justify-center py-2 text-xs font-semibold tabular-nums transition-all hover:scale-105 min-h-[44px]
                               {c.isToday ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--bg)]' : ''}"
                        style="background: {c.isFuture ? 'transparent' : profitColor(c.profit, cal.max)};
                               border: {c.isFuture ? '1px dashed var(--border)' : '1px solid transparent'};"
                        title="{c.day} · {c.date}{c.isFuture ? '' : `\nProfit: ${formatCurrency(c.profit)}\nRevenue: ${formatCurrency(c.revenue)}\nCOGS: ${formatCurrency(c.cogs)}\n${c.count} sale${c.count === 1 ? '' : 's'}`}"
                        onclick={() => { expandedDate = expandedDate === c.date ? null : c.date; }}
                      >
                        <span>{c.day}</span>
                        {#if !c.isFuture && c.count > 0}
                          <span class="text-[9px] opacity-80">{formatCurrencyCompact(c.profit)}</span>
                        {/if}
                      </button>
                    {:else}
                      <div></div>
                    {/if}
                  {/each}
                </div>

                <div class="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-3)] mt-3">
                  <span>Loss</span>
                  <div class="flex gap-0.5">
                    {#each [0, 1, 2, 3] as i}
                      <div class="w-2.5 h-2.5 rounded-sm" style="background:color-mix(in srgb, var(--crimson) {20 + i * 22}%, var(--surface2))"></div>
                    {/each}
                  </div>
                  <span class="mx-1">|</span>
                  <div class="flex gap-0.5">
                    {#each [0, 1, 2, 3] as i}
                      <div class="w-2.5 h-2.5 rounded-sm" style="background:color-mix(in srgb, var(--teal) {20 + i * 22}%, var(--surface2))"></div>
                    {/each}
                  </div>
                  <span>Profit</span>
                </div>

                {#if expandedDate && cal.daySales?.[expandedDate]?.length}
                  <div class="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
                    <p class="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Sales on {expandedDate}</p>
                    {#each cal.daySales[expandedDate] as s}
                      <div class="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-[var(--surface2)]">
                        <a href="/history/{s.saleId}" class="font-mono text-[var(--text-2)] hover:text-[var(--primary)]">{s.saleId.slice(0, 8)}</a>
                        <div class="flex items-center gap-4">
                          <span class="text-[var(--text-3)] tabular-nums">{formatCurrencyCompact(s.revenue)}</span>
                          <span class="font-semibold tabular-nums" style="color:var(--{s.profit >= 0 ? 'teal' : 'crimson'}-fg)">
                            {s.profit >= 0 ? '+' : ''}{formatCurrencyCompact(s.profit)}
                          </span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>

            <div class="col-span-12 lg:col-span-5 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p class="text-xs text-[var(--text-3)] mb-1">Revenue</p>
                  <p class="text-xl font-bold tabular-nums">{formatCurrencyCompact(cal.totalRev)}</p>
                </div>
                <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p class="text-xs text-[var(--text-3)] mb-1">COGS</p>
                  <p class="text-xl font-bold tabular-nums">{formatCurrencyCompact(cal.totalCogs)}</p>
                </div>
                <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p class="text-xs text-[var(--text-3)] mb-1">Gross Profit</p>
                  <p class="text-xl font-bold tabular-nums" style="color:{cal.totalProfit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">{formatCurrencyCompact(cal.totalProfit)}</p>
                </div>
                <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
                  <p class="text-xs text-[var(--text-3)] mb-1">Margin</p>
                  <p class="text-xl font-bold tabular-nums">{cal.totalRev > 0 ? `${(((cal.totalRev - cal.totalCogs) / cal.totalRev) * 100).toFixed(1)}%` : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- ── P&L REPORT ──────────────────────────────────────────────── -->
        {#if pnl && pnlTab === 'report'}
          {@const k = pnl.kpis}
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <p class="text-xs text-[var(--text-3)] mb-1">Revenue</p>
              <p class="text-xl font-bold tabular-nums">{formatCurrencyCompact(k.revenue.current)}</p>
              {#if k.revenue.delta?.pct}
                <div class="mt-1"><TrendBadge direction={k.revenue.delta.direction} label={`${k.revenue.delta.pct}%`} /></div>
              {/if}
            </div>
            <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <p class="text-xs text-[var(--text-3)] mb-1">COGS</p>
              <p class="text-xl font-bold tabular-nums">{formatCurrencyCompact(k.cogs.current)}</p>
              {#if k.cogs.delta?.pct}
                <div class="mt-1"><TrendBadge direction={k.cogs.delta.direction} label={`${k.cogs.delta.pct}%`} /></div>
              {/if}
            </div>
            <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <p class="text-xs text-[var(--text-3)] mb-1">Gross Profit</p>
              <p class="text-xl font-bold tabular-nums" style="color:{k.profit.current >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">{formatCurrencyCompact(k.profit.current)}</p>
              {#if k.profit.delta?.pct}
                <div class="mt-1"><TrendBadge direction={k.profit.delta.direction} label={`${k.profit.delta.pct}%`} /></div>
              {/if}
            </div>
            <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-4">
              <p class="text-xs text-[var(--text-3)] mb-1">Margin</p>
              <p class="text-xl font-bold tabular-nums">{k.margin.current.toFixed(1)}%</p>
              {#if k.margin.delta?.pct}
                <div class="mt-1"><TrendBadge direction={k.margin.delta.direction} label={`${k.margin.delta.pct}%`} /></div>
              {/if}
            </div>
          </div>

          {#if k.coverage < 80}
            <div class="bg-[var(--bg)] border border-[var(--gold)] rounded-xl p-3 text-xs text-[var(--gold-fg)] flex items-center gap-2">
              <span>⚠</span>
              <span>Cost data available for {k.coverage}% of line items. Margin figures may be understated.</span>
            </div>
          {/if}

          <!-- Daily breakdown -->
          <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Daily Breakdown</h2>
            {#if pnl.dailyRows.length === 0}
              <p class="text-sm text-[var(--text-3)] py-8 text-center">No sales data for this period.</p>
            {:else}
              <div class="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 bg-[var(--bg)]">
                    <tr class="border-b border-[var(--border)]">
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Date</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Sales</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Revenue</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">COGS</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Profit</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pnl.dailyRows as row}
                      <tr class="border-b border-[var(--border)] last:border-0">
                        <td class="py-3 pr-4 font-medium whitespace-nowrap">{row.label}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{row.count}</td>
                        <td class="py-3 pr-4 text-right tabular-nums">{formatCurrencyCompact(row.revenue)}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(row.cogs)}</td>
                        <td class="py-3 pr-4 text-right font-semibold tabular-nums" style="color:{row.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                          {row.profit >= 0 ? '+' : ''}{formatCurrencyCompact(row.profit)}
                        </td>
                        <td class="py-3 text-right"><MarginBadge value={row.margin} /></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>

          <!-- Top products by profit -->
          <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <h2 class="text-sm font-semibold text-[var(--text)] mb-4">Top Products by Profit</h2>
            {#if pnl.topProducts.length === 0}
              <p class="text-sm text-[var(--text-3)] py-8 text-center">No product data.</p>
            {:else}
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-[var(--border)]">
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-2">#</th>
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Product</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Units</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Revenue</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">COGS</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Profit</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pnl.topProducts as p, i}
                      <tr class="border-b border-[var(--border)] last:border-0">
                        <td class="py-3 pr-2">
                          <span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold"
                                style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">{i + 1}</span>
                        </td>
                        <td class="py-3 pr-4 font-medium">{p.name}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{p.units}</td>
                        <td class="py-3 pr-4 text-right tabular-nums">{formatCurrencyCompact(p.revenue)}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(p.cogs)}</td>
                        <td class="py-3 pr-4 text-right font-semibold tabular-nums" style="color:{p.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                          {p.profit >= 0 ? '+' : ''}{formatCurrencyCompact(p.profit)}
                        </td>
                        <td class="py-3 text-right"><MarginBadge value={p.margin} /></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/if}

        <!-- ── P&L BILL-BY-BILL ────────────────────────────────────────── -->
        {#if pnl && pnlTab === 'bills'}
          <div class="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-5">
            <!-- Search -->
            <div class="flex items-center gap-3 mb-4">
              <Search size={16} class="text-[var(--text-3)] shrink-0" />
              <input
                type="text" placeholder="Search by sale ref or customer…"
                class="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
                bind:value={billSearch} oninput={() => { billPage = 0; }}
              />
              {#if billSearch}
                <button class="text-xs text-[var(--text-3)] hover:text-[var(--text)]"
                        onclick={() => { billSearch = ''; billPage = 0; }}>Clear</button>
              {/if}
            </div>

            {#if filteredBills.length === 0}
              <p class="text-sm text-[var(--text-3)] py-12 text-center">No bills found.</p>
            {:else}
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-[var(--border)]">
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Sale Ref</th>
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('date')}>Date <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-left font-medium text-xs text-[var(--text-3)] pb-3 pr-4">Customer</th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('revenue')}>Revenue <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('cogs')}>COGS <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3 pr-4">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('profit')}>Profit <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-right font-medium text-xs text-[var(--text-3)] pb-3">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('margin')}>Margin <ArrowUpDown size={10} /></button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pagedBills as bill}
                      <tr class="border-b border-[var(--border)] last:border-0">
                        <td class="py-3 pr-4"><a href="/history/{bill.id}" class="font-mono text-[var(--text-2)] hover:text-[var(--primary)]">{bill.ref}</a></td>
                        <td class="py-3 pr-4 whitespace-nowrap">{formatDateTime(bill.date)}</td>
                        <td class="py-3 pr-4 text-[var(--text-2)]">{bill.customer ?? '—'}</td>
                        <td class="py-3 pr-4 text-right tabular-nums">{formatCurrencyCompact(bill.revenue)}</td>
                        <td class="py-3 pr-4 text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(bill.cogs)}</td>
                        <td class="py-3 pr-4 text-right font-semibold tabular-nums" style="color:{bill.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                          {bill.profit >= 0 ? '+' : ''}{formatCurrencyCompact(bill.profit)}
                        </td>
                        <td class="py-3 text-right"><MarginBadge value={bill.margin} /></td>
                      </tr>
                    {/each}
                  </tbody>
                  <tfoot>
                    <tr class="border-t-2 border-[var(--border)]">
                      <td colspan="3" class="py-3 font-semibold">Total ({filteredBills.length} bills)</td>
                      <td class="py-3 text-right font-bold tabular-nums">{formatCurrencyCompact(runningTotal.revenue)}</td>
                      <td class="py-3 text-right font-bold tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(runningTotal.cogs)}</td>
                      <td class="py-3 text-right font-bold tabular-nums" style="color:{runningTotal.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                        {runningTotal.profit >= 0 ? '+' : ''}{formatCurrencyCompact(runningTotal.profit)}
                      </td>
                      <td class="py-3 text-right">
                        <MarginBadge value={runningTotal.revenue > 0 ? Math.round(((runningTotal.profit / runningTotal.revenue) * 100) * 10) / 10 : 0} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {#if billTotalPages > 1}
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                  <span class="text-xs text-[var(--text-3)]">Page {billPage + 1} of {billTotalPages}</span>
                  <div class="flex gap-2">
                    <button class="btn btn-sm btn-secondary" disabled={billPage === 0} onclick={() => { billPage = Math.max(0, billPage - 1); }}>
                      <ChevronLeft size={12} /> Prev
                    </button>
                    <button class="btn btn-sm btn-secondary" disabled={billPage >= billTotalPages - 1} onclick={() => { billPage = Math.min(billTotalPages - 1, billPage + 1); }}>
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    {/if}

  {/if}
{/if}
