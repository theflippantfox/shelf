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
    Calendar, Package, Banknote, Activity,
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

<div class="fade-up">
  <!-- ── HEADER ────────────────────────────────────────────────────────── -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
    <h1 class="text-[22px] md:text-[26px] font-semibold text-[var(--text)] tracking-tight">Analytics</h1>
    <div class="flex items-center gap-3">
      <div class="inline-flex gap-1 bg-[var(--surface2)] p-1 rounded-lg">
        <button
          class="px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all"
          style="background:{activeTab === 'overview' ? 'var(--primary)' : 'transparent'}; color:{activeTab === 'overview' ? 'var(--primary-fg)' : 'var(--text-2)'}"
          onclick={() => switchTab('overview')}
        >Overview</button>
        <button
          class="px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all"
          style="background:{activeTab === 'pnl' ? 'var(--primary)' : 'transparent'}; color:{activeTab === 'pnl' ? 'var(--primary-fg)' : 'var(--text-2)'}"
          onclick={() => switchTab('pnl')}
        >P&L Report</button>
      </div>
      <PeriodSelector {presets} active={period?.preset ?? '30d'} onchange={changePeriod} />
    </div>
  </div>

  {#if !analytics}
    <div class="surface-card flex flex-col items-center justify-center h-64 text-[var(--text-3)]">
      <div class="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3"></div>
      <p class="text-[13px] font-semibold text-[var(--text)]">Crunching your numbers</p>
    </div>
  {:else}
    {@const hasData = (kpis?.transactions?.current ?? 0) > 0 || (kpis?.revenue?.current ?? 0) > 0}

    {#if !hasData}
      <div class="surface-card flex flex-col items-center justify-center text-center py-14 px-5">
        <div class="w-14 h-14 rounded-full flex items-center justify-center mb-3"
             style="background: color-mix(in srgb, var(--primary) 14%, transparent);">
          <BarChart3 size={24} strokeWidth={1.5} style="color:var(--primary)" />
        </div>
        <p class="text-[15px] font-semibold text-[var(--text)]">No data for this period</p>
        <p class="text-[12.5px] text-[var(--text-3)] mt-1 max-w-sm leading-relaxed">
          Once you start ringing up sales, your revenue, profit, and trends will show up here.
        </p>
        <a href="/sale" class="btn btn-primary mt-4">
          <ShoppingCart size={14} strokeWidth={2} /> Make your first sale
        </a>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- OVERVIEW TAB                                                      -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if hasData && activeTab === 'overview'}
      <div class="grid grid-cols-12 gap-3 anim-stagger">

        <!-- ── KPI STRIP (full width, 5 cols) ──────────────────────────── -->
        <div class="col-span-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div class="surface-card px-5 py-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                 style="background:color-mix(in srgb, var(--primary) 10%, transparent)">
              <TrendingUp size={20} strokeWidth={1.5} style="color:var(--primary)" />
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-medium text-[var(--text-3)] mb-1">Revenue</p>
              <div class="flex items-baseline gap-2">
                <p class="text-[22px] font-bold tabular-nums leading-tight truncate">{formatCurrencyCompact(kpis.revenue.current)}</p>
                {#if kpis.revenue.delta?.pct}
                  <TrendBadge direction={kpis.revenue.delta.direction} label={`${Math.abs(kpis.revenue.delta.pct)}%`} />
                {/if}
              </div>
            </div>
          </div>

          <div class="surface-card px-5 py-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                 style="background:color-mix(in srgb, var(--cobalt) 10%, transparent)">
              <Activity size={20} strokeWidth={1.5} style="color:var(--cobalt)" />
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-medium text-[var(--text-3)] mb-1">Transactions</p>
              <div class="flex items-baseline gap-2">
                <p class="text-[22px] font-bold tabular-nums leading-tight">{kpis.transactions.current.toLocaleString()}</p>
                {#if kpis.transactions.delta?.pct}
                  <TrendBadge direction={kpis.transactions.delta.direction} label={`${Math.abs(kpis.transactions.delta.pct)}%`} />
                {/if}
              </div>
            </div>
          </div>

          <div class="surface-card px-5 py-4 flex items-center gap-4">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                 style="background:color-mix(in srgb, var(--teal) 10%, transparent)">
              <BarChart3 size={20} strokeWidth={1.5} style="color:var(--teal)" />
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-medium text-[var(--text-3)] mb-1">Avg Order</p>
              <div class="flex items-baseline gap-2">
                <p class="text-[22px] font-bold tabular-nums leading-tight">{formatCurrencyCompact(kpis.avgOrder.current)}</p>
                {#if kpis.avgOrder.delta?.pct}
                  <TrendBadge direction={kpis.avgOrder.delta.direction} label={`${Math.abs(kpis.avgOrder.delta.pct)}%`} />
                {/if}
              </div>
            </div>
          </div>

          {#if kpis.margin}
            <div class="surface-card px-5 py-4 flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                   style="background:color-mix(in srgb, var(--gold) 10%, transparent)">
                <Percent size={20} strokeWidth={1.5} style="color:var(--gold)" />
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-medium text-[var(--text-3)] mb-1">Margin</p>
                <div class="flex items-baseline gap-2">
                  <p class="text-[22px] font-bold tabular-nums leading-tight">{kpis.margin.current.toFixed(1)}%</p>
                  {#if kpis.margin.delta?.pp}
                    <TrendBadge direction={kpis.margin.delta.direction} label={`${Math.abs(kpis.margin.delta.pp)}pp`} />
                  {/if}
                </div>
              </div>
            </div>
          {/if}

          {#if stockValue}
            <div class="surface-card px-5 py-4 flex items-center gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                   style="background:color-mix(in srgb, var(--cobalt) 10%, transparent)">
                <Package size={20} strokeWidth={1.5} style="color:var(--cobalt)" />
              </div>
              <div class="min-w-0">
                <p class="text-[11px] font-medium text-[var(--text-3)] mb-1">Stock</p>
                <div class="flex items-baseline gap-2">
                  <p class="text-[22px] font-bold tabular-nums leading-tight truncate">{formatCurrencyCompact(stockValue.retailValue)}</p>
                  <span class="text-[11px] text-[var(--text-3)]">retail</span>
                </div>
                <p class="text-[10px] text-[var(--text-3)]">{stockValue.totalUnits.toLocaleString()} units</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- ── OUTSTANDING RECEIVABLES (full width, conditional) ───────── -->
        {#if analytics?.outstanding && analytics.outstanding.total > 0}
          <div class="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="surface-card px-4 py-3 flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                   style="background:color-mix(in srgb, var(--gold) 12%, transparent)">
                <Clock size={16} strokeWidth={2} style="color:var(--gold)" />
              </div>
              <div>
                <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Outstanding</p>
                <p class="text-[17px] font-bold tabular-nums leading-tight" style="color:var(--gold-fg)">
                  {formatCurrencyCompact(analytics.outstanding.total)}
                </p>
                <p class="text-[10px] text-[var(--text-3)]">{analytics.outstanding.byCustomer.length} customer{analytics.outstanding.byCustomer.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <div class="surface-card p-4 space-y-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">By Status</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--text-2)] flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[var(--crimson)]"></span> Pending
                </span>
                <span class="font-semibold tabular-nums">{formatCurrencyCompact(analytics.outstanding.byStatus.pending ?? 0)}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-[var(--text-2)] flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[var(--gold)]"></span> Partial
                </span>
                <span class="font-semibold tabular-nums">{formatCurrencyCompact(analytics.outstanding.byStatus.partial ?? 0)}</span>
              </div>
            </div>
            <div class="surface-card p-4 space-y-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-3)]">Top Customers</p>
              {#if analytics.outstanding.byCustomer.length === 0}
                <p class="text-xs text-[var(--text-3)]">No outstanding credit.</p>
              {:else}
                <ul class="space-y-1.5">
                  {#each analytics.outstanding.byCustomer.slice(0, 4) as c (c.id)}
                    <li class="flex items-center justify-between text-xs">
                      <a href="/customers/{c.id}" class="font-medium text-[var(--text)] truncate hover:text-[var(--primary)]">{c.name}</a>
                      <span class="font-semibold tabular-nums whitespace-nowrap" style="color:var(--gold-fg)">{formatCurrencyCompact(c.outstanding)}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        {/if}

        <!-- ── REVENUE TREND (8 cols) + PAYMENT METHODS (4 cols) ──────── -->
        <div class="col-span-12 lg:col-span-8 surface-card p-4 md:p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">
              {activeMetric === 'revenue' ? 'Revenue' : activeMetric === 'transactions' ? 'Transactions' : 'Avg Order'} Trend
            </h3>
            <div class="inline-flex gap-1 bg-[var(--surface2)] p-1 rounded-lg">
              {#each metricTabs as tab}
                {@const active = activeMetric === tab.key}
                <button
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all"
                  style="background:{active ? 'var(--primary)' : 'transparent'}; color:{active ? 'var(--primary-fg)' : 'var(--text-2)'}"
                  onclick={() => (activeMetric = tab.key)}
                >
                  <DynamicIcon name={tab.icon} size={11} strokeWidth={2} />
                  {tab.label}
                </button>
              {/each}
            </div>
          </div>
          <div class="h-56 w-full">
            <AreaChart labels={trendLabels} datasets={trendDatasets}
              yFormat={activeMetric === 'transactions' ? 'count' : 'currency'} height={224} />
          </div>
        </div>

        <div class="col-span-12 lg:col-span-4 surface-card p-4 md:p-5 space-y-3">
          <h3 class="text-[13px] font-semibold text-[var(--text)]">Payment Methods</h3>
          {#if paymentRows.length === 0}
            <p class="text-xs text-[var(--text-3)] py-8 text-center">No payments in this period.</p>
          {:else}
            {@const totalPaymentRev = paymentRows.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)}
            <div class="h-36 w-full">
              <DonutChart
                labels={paymentRows.map((pm: any) => pm.label)}
                data={paymentRows.map((pm: any) => pm.revenue ?? 0)}
                centerValue={formatCurrency(totalPaymentRev)}
                centerLabel="total"
              />
            </div>
            <div class="space-y-1.5 pt-1">
              {#each paymentRows as pm, i}
                <div class="flex items-center justify-between text-[12px]">
                  <span class="flex items-center gap-2 text-[var(--text-2)] truncate">
                    <span class="w-2 h-2 rounded-sm shrink-0"
                          style="background:{['var(--primary)', 'var(--cobalt)', 'var(--gold)', 'var(--rose)', 'var(--crimson)', 'var(--teal)'][i % 6]}"></span>
                    {pm.label}
                  </span>
                  <span class="font-semibold tabular-nums shrink-0">{formatCurrency(pm.revenue)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- ── PROFIT + INVENTORY (full width, 2-col) ─────────────────── -->
        {#if grossProfit || stockValue}
          <div class="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-3">
            {#if grossProfit}
              <div class="surface-card p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Banknote size={14} strokeWidth={2} style="color:var(--teal)" />
                    <h3 class="text-[13px] font-semibold text-[var(--text)]">Gross Profit</h3>
                  </div>
                  {#if grossProfit.delta}
                    <TrendBadge direction={grossProfit.delta.direction} label={`${Math.abs(grossProfit.delta.pct)}%`} />
                  {/if}
                </div>
                <p class="text-xl font-bold tabular-nums">{formatCurrencyCompact(grossProfit.current)}</p>
                <p class="text-[10px] text-[var(--text-3)]">vs {formatCurrencyCompact(grossProfit.previous)} prev period</p>
                {#if grossProfit.coverage !== undefined && grossProfit.coverage < 80}
                  <p class="text-[10px] text-[var(--gold-fg)]">⚠ Cost data on {grossProfit.coverage}% of items</p>
                {/if}
              </div>
            {/if}

            {#if stockValue}
              <div class="surface-card p-5 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-[13px] font-semibold text-[var(--text)]">Inventory</h3>
                  <span class="px-2 py-0.5 text-[10px] font-semibold tabular-nums rounded-full" style="background:color-mix(in srgb, var(--cobalt) 10%, transparent); color:var(--cobalt-fg)">
                    {stockValue.potentialMargin.toFixed(1)}% potential margin
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-[11px] text-[var(--text-3)] mb-1">At Retail</p>
                    <p class="text-[22px] font-bold tabular-nums leading-tight">{formatCurrencyCompact(stockValue.retailValue)}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] text-[var(--text-3)] mb-1">At Cost</p>
                    <p class="text-[17px] font-semibold tabular-nums leading-tight text-[var(--text-2)]">{formatCurrencyCompact(stockValue.costValue)}</p>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-[var(--text-3)]">Margin</span>
                    <span class="font-semibold tabular-nums" style="color:var(--cobalt-fg)">{stockValue.potentialMargin.toFixed(1)}%</span>
                  </div>
                  <div class="h-2 rounded-full bg-[var(--surface2)] overflow-hidden">
                    <div class="h-full rounded-full" style="width:{Math.min(100, stockValue.potentialMargin).toFixed(1)}%; background:var(--cobalt)"></div>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <span class="text-[11px] text-[var(--text-3)]">Total Units</span>
                  <span class="text-[13px] font-semibold tabular-nums">{stockValue.totalUnits.toLocaleString()}</span>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- ── 12-MONTH TREND (full width) ────────────────────────────── -->
        <div class="col-span-12 surface-card p-4 md:p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">12-Month Trend</h3>
            <span class="text-[10px] font-semibold text-[var(--text-3)]">{monthlyLabels.length} month{monthlyLabels.length === 1 ? '' : 's'}</span>
          </div>
          <div class="h-48 w-full">
            <BarChart labels={monthlyLabels} data={monthlyRevData} color="var(--cobalt)" height={192} yFormat="currency" highlightLast />
          </div>
        </div>

        <!-- ── CALENDAR (4 cols) + BUSIEST TIMES (8 cols) ────────────── -->
        <div class="col-span-12 lg:col-span-4 surface-card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">Sales Calendar</h3>
            {#if calendar?.hasData}
              <span class="text-[10px] font-semibold text-[var(--text-3)]">{formatCurrencyCompact(calendar.total)} in {calendar.monthLabel}</span>
            {/if}
          </div>

          {#if !calendar}
            <div class="h-48 flex items-center justify-center text-[12px] text-[var(--text-3)]">No calendar data.</div>
          {:else if !calendar.hasData}
            <div class="h-48 flex items-center justify-center text-[12px] text-[var(--text-3)]">No sales in {calendar.monthLabel}.</div>
          {:else}
            {@const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']}
            <div class="flex items-center justify-between text-[11px] font-semibold">
              <span>{calendar.monthLabel}</span>
              {#if calendar.bestDay}
                <span class="text-[9px] text-[var(--text-3)] font-normal">Best: day {calendar.bestDay.date.slice(8)} · {formatCurrencyCompact(calendar.bestDay.value)}</span>
              {/if}
            </div>
            <div class="grid grid-cols-7 gap-1 text-[9px] text-[var(--text-3)] font-medium text-center">
              {#each dayLabels as l}<div>{l}</div>{/each}
            </div>
            <div class="grid grid-cols-7 gap-1" style="grid-template-rows: repeat({calendar.weeks}, minmax(0, 1fr));">
              {#each calendar.cells as c}
                {#if c.date}
                  {@const v = c.value}
                  {@const intensity = v > 0 ? Math.max(0.18, v / (calendar.max || 1)) : 0}
                  <div class="rounded-md flex items-center justify-center text-[10px] font-semibold tabular-nums transition-transform hover:scale-110 min-h-0
                              {c.isToday ? 'ring-1 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : ''}"
                       style="background: {c.isFuture ? 'transparent' : v > 0 ? `color-mix(in srgb, var(--teal) ${Math.round(intensity * 100)}%, var(--surface2))` : 'color-mix(in srgb, var(--surface2) 60%, var(--text-3) 8%)'};
                              border: {c.isFuture ? '1px dashed color-mix(in srgb, var(--text-3) 35%, transparent)' : '1px solid transparent'};
                              color: {c.isFuture ? 'var(--text-3)' : v > 0 ? 'var(--primary-fg)' : 'var(--text-2)'};"
                       title="{c.day} · {c.date}{c.isFuture ? '' : `\n${formatCurrency(v)} · ${c.count} sale${c.count === 1 ? '' : 's'}`}">{c.day}</div>
                {:else}
                  <div></div>
                {/if}
              {/each}
            </div>
            <div class="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-3)]">
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

        <div class="col-span-12 lg:col-span-8 surface-card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">Busiest Times</h3>
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

        <!-- ── TOP PRODUCTS (6 cols) + CATEGORIES (6 cols) ────────────── -->
        <div class="col-span-12 lg:col-span-6 surface-card p-4 space-y-3">
          <h3 class="text-[13px] font-semibold text-[var(--text)]">Top Products</h3>
          <div class="overflow-x-auto">
            <table class="tbl w-full">
              <thead>
                <tr>
                  <th class="w-8 text-left text-[10px]">#</th>
                  <th class="text-left text-[10px]">Product</th>
                  <th class="text-right text-[10px]">Revenue</th>
                  <th class="text-right text-[10px]">Units</th>
                  <th class="text-right text-[10px]">Margin</th>
                </tr>
              </thead>
              <tbody>
                {#each analytics.products?.byRevenue ?? [] as product, i}
                  <tr>
                    <td>
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold font-mono"
                            style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">{i + 1}</span>
                    </td>
                    <td class="font-medium text-[12px]">{product.name ?? '—'}</td>
                    <td class="text-right text-[12px] font-semibold tabular-nums">{formatCurrency(product.revenue)}</td>
                    <td class="text-right text-[12px] tabular-nums text-[var(--text-2)]">{product.units}</td>
                    <td class="text-right"><MarginBadge value={product.margin} /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        {#if (analytics.categories ?? []).length > 0}
          <div class="col-span-12 lg:col-span-6 surface-card p-4 space-y-3">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">Categories</h3>
            <div class="overflow-x-auto">
              <table class="tbl w-full">
                <thead>
                  <tr>
                    <th class="text-left text-[10px]">Category</th>
                    <th class="text-right text-[10px]">Revenue</th>
                    <th class="text-right text-[10px]">Units</th>
                    <th class="text-right text-[10px]">Avg Sale</th>
                    <th class="text-right text-[10px]">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {#each analytics.categories as cat}
                    <tr>
                      <td class="font-medium text-[12px]">{cat.name}</td>
                      <td class="text-right text-[12px] font-semibold tabular-nums">{formatCurrency(cat.revenue)}</td>
                      <td class="text-right text-[12px] tabular-nums text-[var(--text-2)]">{cat.units}</td>
                      <td class="text-right text-[12px] tabular-nums text-[var(--text-2)]">{formatCurrency(Math.round(cat.revenue / (cat.units || 1)))}</td>
                      <td class="text-right"><MarginBadge value={cat.margin} /></td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}

        <!-- ── CUSTOMER TIERS (4 cols) + TOP CUSTOMERS (8 cols) ───────── -->
        <div class="col-span-12 lg:col-span-4 surface-card p-4 space-y-3">
          <h3 class="text-[13px] font-semibold text-[var(--text)]">Customers <span class="text-[var(--text-3)] font-normal">({uniqueBuyers} buyers)</span></h3>
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg p-3 text-center" style="background:color-mix(in srgb, var(--gold) 12%, transparent)">
              <p class="text-[9px] font-bold uppercase tracking-wide" style="color:var(--gold-fg)">VIP</p>
              <p class="text-xl font-bold tabular-nums mt-0.5">{customerTiers?.vip ?? 0}</p>
            </div>
            <div class="rounded-lg p-3 text-center" style="background:color-mix(in srgb, var(--primary) 10%, transparent)">
              <p class="text-[9px] font-bold uppercase tracking-wide">Regular</p>
              <p class="text-xl font-bold tabular-nums mt-0.5">{customerTiers?.regular ?? 0}</p>
            </div>
            <div class="rounded-lg p-3 text-center" style="background:var(--surface2)">
              <p class="text-[9px] font-bold uppercase tracking-wide text-[var(--text-3)]">New</p>
              <p class="text-xl font-bold tabular-nums mt-0.5">{customerTiers?.new ?? 0}</p>
            </div>
          </div>
          <p class="text-[9px] text-[var(--text-3)] text-center">Tiers based on lifetime spend</p>
        </div>

        <div class="col-span-12 lg:col-span-8 surface-card p-4 space-y-3">
          <h3 class="text-[13px] font-semibold text-[var(--text)]">Top Customers</h3>
          <div class="overflow-x-auto">
            <table class="tbl w-full">
              <thead>
                <tr>
                  <th class="w-8 text-left text-[10px]">#</th>
                  <th class="text-left text-[10px]">Name</th>
                  <th class="text-right text-[10px]">Spent</th>
                  <th class="text-right text-[10px]">Visits</th>
                </tr>
              </thead>
              <tbody>
                {#each leaderboard as customer, i}
                  <tr>
                    <td>
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold font-mono"
                            style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">{i + 1}</span>
                    </td>
                    <td class="font-medium text-[12px]">{customer.name ?? '—'}</td>
                    <td class="text-right text-[12px] font-semibold tabular-nums">{formatCurrency(customer.spent)}</td>
                    <td class="text-right text-[12px] tabular-nums text-[var(--text-2)]">{customer.visits}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- P&L TAB                                                           -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if hasData && activeTab === 'pnl'}
      <div class="grid grid-cols-12 gap-3 anim-stagger">
        <!-- P&L sub-tabs (full width) -->
        <div class="col-span-12">
          <div class="inline-flex gap-1 bg-[var(--surface2)] p-1 rounded-lg">
            {#each [{ key: 'calendar', label: 'Calendar', icon: Calendar }, { key: 'report', label: 'Report', icon: FileText }, { key: 'bills', label: 'Bill-by-Bill', icon: Receipt }] as t}
              {@const active = pnlTab === t.key}
              <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all"
                style="background:{active ? 'var(--primary)' : 'transparent'}; color:{active ? 'var(--primary-fg)' : 'var(--text-2)'}"
                onclick={() => switchPnlTab(t.key as 'calendar' | 'report' | 'bills')}
              >
                <t.icon size={13} strokeWidth={2} />
                {t.label}
              </button>
            {/each}
          </div>
        </div>

        {#if !pnl}
          <div class="col-span-12 surface-card flex flex-col items-center justify-center h-64 text-[var(--text-3)]">
            <div class="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3"></div>
            <p class="text-[13px] font-semibold text-[var(--text)]">Loading P&L data</p>
          </div>
        {/if}

        <!-- ── P&L CALENDAR ────────────────────────────────────────────── -->
        {#if pnl && pnlTab === 'calendar'}
          {@const cal = pnl.profitCalendar}
          <div class="col-span-12 lg:col-span-7 surface-card p-4 md:p-5">
            <div class="flex items-center justify-between mb-4">
              <button class="btn btn-sm btn-secondary" onclick={() => navMonth(-1)}>
                <ChevronLeft size={14} strokeWidth={2} /> Prev
              </button>
              <h2 class="text-[15px] font-semibold text-[var(--text)]">{cal.monthLabel}</h2>
              <button class="btn btn-sm btn-secondary" onclick={() => navMonth(1)}>
                Next <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            {#if !cal.hasData}
              <div class="h-48 flex items-center justify-center text-[12px] text-[var(--text-3)]">No sales data for {cal.monthLabel}.</div>
            {:else}
              {@const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']}
              <div class="grid grid-cols-7 gap-1 text-[9px] text-[var(--text-3)] font-medium text-center mb-1">
                {#each dayLabels as l}<div>{l}</div>{/each}
              </div>
              <div class="grid grid-cols-7 gap-1" style="grid-template-rows: repeat({cal.weeks}, minmax(0, 1fr));">
                {#each cal.cells as c}
                  {#if c.date}
                    <button
                      class="rounded-md flex flex-col items-center justify-center py-2 text-[11px] font-semibold tabular-nums transition-all hover:scale-105 min-h-[44px]
                             {c.isToday ? 'ring-1 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : ''}"
                      style="background: {c.isFuture ? 'transparent' : profitColor(c.profit, cal.max)};
                             border: {c.isFuture ? '1px dashed color-mix(in srgb, var(--text-3) 35%, transparent)' : '1px solid transparent'};"
                      title="{c.day} · {c.date}{c.isFuture ? '' : `\nProfit: ${formatCurrency(c.profit)}\nRevenue: ${formatCurrency(c.revenue)}\nCOGS: ${formatCurrency(c.cogs)}\n${c.count} sale${c.count === 1 ? '' : 's'}`}"
                      onclick={() => { expandedDate = expandedDate === c.date ? null : c.date; }}
                    >
                      <span>{c.day}</span>
                      {#if !c.isFuture && c.count > 0}
                        <span class="text-[8px] opacity-80">{formatCurrencyCompact(c.profit)}</span>
                      {/if}
                    </button>
                  {:else}
                    <div></div>
                  {/if}
                {/each}
              </div>

              <div class="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-3)] mt-2">
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
                <div class="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
                  <p class="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Sales on {expandedDate}</p>
                  {#each cal.daySales[expandedDate] as s}
                    <div class="flex items-center justify-between text-[12px] py-1 px-2 rounded-md bg-[var(--surface2)]">
                      <a href="/history/{s.saleId}" class="font-mono text-[var(--text-2)] hover:text-[var(--primary)]">{s.saleId.slice(0, 8)}</a>
                      <div class="flex items-center gap-3">
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

          <div class="col-span-12 lg:col-span-5 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="surface-card px-4 py-3">
                <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Revenue</p>
                <p class="text-[17px] font-bold tabular-nums leading-tight">{formatCurrencyCompact(cal.totalRev)}</p>
              </div>
              <div class="surface-card px-4 py-3">
                <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">COGS</p>
                <p class="text-[17px] font-bold tabular-nums leading-tight">{formatCurrencyCompact(cal.totalCogs)}</p>
              </div>
              <div class="surface-card px-4 py-3">
                <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Gross Profit</p>
                <p class="text-[17px] font-bold tabular-nums leading-tight" style="color:{cal.totalProfit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">{formatCurrencyCompact(cal.totalProfit)}</p>
              </div>
              <div class="surface-card px-4 py-3">
                <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Margin</p>
                <p class="text-[17px] font-bold tabular-nums leading-tight">{cal.totalRev > 0 ? `${(((cal.totalRev - cal.totalCogs) / cal.totalRev) * 100).toFixed(1)}%` : '—'}</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- ── P&L REPORT ──────────────────────────────────────────────── -->
        {#if pnl && pnlTab === 'report'}
          {@const k = pnl.kpis}
          <div class="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="surface-card px-4 py-3">
              <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Revenue</p>
              <p class="text-[17px] font-bold tabular-nums">{formatCurrencyCompact(k.revenue.current)}</p>
              {#if k.revenue.delta?.pct}
                <TrendBadge direction={k.revenue.delta.direction} label={`${k.revenue.delta.pct}%`} />
              {/if}
            </div>
            <div class="surface-card px-4 py-3">
              <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">COGS</p>
              <p class="text-[17px] font-bold tabular-nums">{formatCurrencyCompact(k.cogs.current)}</p>
              {#if k.cogs.delta?.pct}
                <TrendBadge direction={k.cogs.delta.direction} label={`${k.cogs.delta.pct}%`} />
              {/if}
            </div>
            <div class="surface-card px-4 py-3">
              <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Gross Profit</p>
              <p class="text-[17px] font-bold tabular-nums" style="color:{k.profit.current >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">{formatCurrencyCompact(k.profit.current)}</p>
              {#if k.profit.delta?.pct}
                <TrendBadge direction={k.profit.delta.direction} label={`${k.profit.delta.pct}%`} />
              {/if}
            </div>
            <div class="surface-card px-4 py-3">
              <p class="text-[10px] font-medium uppercase tracking-wide text-[var(--text-3)]">Margin</p>
              <p class="text-[17px] font-bold tabular-nums">{k.margin.current.toFixed(1)}%</p>
              {#if k.margin.delta?.pct}
                <TrendBadge direction={k.margin.delta.direction} label={`${k.margin.delta.pct}%`} />
              {/if}
            </div>
          </div>

          {#if k.coverage < 80}
            <div class="col-span-12 surface-card-flat p-3 text-[11px] text-[var(--gold-fg)] flex items-center gap-2">
              <span>⚠</span>
              <span>Cost data available for {k.coverage}% of line items. Margin figures may be understated.</span>
            </div>
          {/if}

          <!-- Daily breakdown (full width table) -->
          <div class="col-span-12 surface-card p-4 space-y-3">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">Daily Breakdown</h3>
            {#if pnl.dailyRows.length === 0}
              <p class="text-xs text-[var(--text-3)] py-4 text-center">No sales data for this period.</p>
            {:else}
              <div class="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table class="tbl w-full">
                  <thead class="sticky top-0 bg-[var(--surface)]">
                    <tr>
                      <th class="text-left text-[10px]">Date</th>
                      <th class="text-right text-[10px]">Sales</th>
                      <th class="text-right text-[10px]">Revenue</th>
                      <th class="text-right text-[10px]">COGS</th>
                      <th class="text-right text-[10px]">Profit</th>
                      <th class="text-right text-[10px]">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pnl.dailyRows as row}
                      <tr>
                        <td class="font-medium whitespace-nowrap">{row.label}</td>
                        <td class="text-right tabular-nums text-[var(--text-2)]">{row.count}</td>
                        <td class="text-right tabular-nums">{formatCurrencyCompact(row.revenue)}</td>
                        <td class="text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(row.cogs)}</td>
                        <td class="text-right font-semibold tabular-nums" style="color:{row.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                          {row.profit >= 0 ? '+' : ''}{formatCurrencyCompact(row.profit)}
                        </td>
                        <td class="text-right"><MarginBadge value={row.margin} /></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>

          <!-- Top products by profit -->
          <div class="col-span-12 surface-card p-4 space-y-3">
            <h3 class="text-[13px] font-semibold text-[var(--text)]">Top Products by Profit</h3>
            {#if pnl.topProducts.length === 0}
              <p class="text-xs text-[var(--text-3)] py-4 text-center">No product data.</p>
            {:else}
              <div class="overflow-x-auto">
                <table class="tbl w-full">
                  <thead>
                    <tr>
                      <th class="w-8 text-left text-[10px]">#</th>
                      <th class="text-left text-[10px]">Product</th>
                      <th class="text-right text-[10px]">Units</th>
                      <th class="text-right text-[10px]">Revenue</th>
                      <th class="text-right text-[10px]">COGS</th>
                      <th class="text-right text-[10px]">Profit</th>
                      <th class="text-right text-[10px]">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pnl.topProducts as p, i}
                      <tr>
                        <td>
                          <span class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold font-mono"
                                style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">{i + 1}</span>
                        </td>
                        <td class="font-medium">{p.name}</td>
                        <td class="text-right tabular-nums text-[var(--text-2)]">{p.units}</td>
                        <td class="text-right tabular-nums">{formatCurrencyCompact(p.revenue)}</td>
                        <td class="text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(p.cogs)}</td>
                        <td class="text-right font-semibold tabular-nums" style="color:{p.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                          {p.profit >= 0 ? '+' : ''}{formatCurrencyCompact(p.profit)}
                        </td>
                        <td class="text-right"><MarginBadge value={p.margin} /></td>
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
          <div class="col-span-12 surface-card p-4 space-y-3">
            <!-- Search bar -->
            <div class="flex items-center gap-2">
              <Search size={14} strokeWidth={2} class="text-[var(--text-3)] shrink-0" />
              <input
                type="text" placeholder="Search by sale ref or customer…"
                class="flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
                bind:value={billSearch} oninput={() => { billPage = 0; }}
              />
              {#if billSearch}
                <button class="text-[10px] text-[var(--text-3)] hover:text-[var(--text)]"
                        onclick={() => { billSearch = ''; billPage = 0; }}>Clear</button>
              {/if}
            </div>

            {#if filteredBills.length === 0}
              <p class="text-xs text-[var(--text-3)] py-6 text-center">No bills found.</p>
            {:else}
              <div class="overflow-x-auto">
                <table class="tbl w-full">
                  <thead>
                    <tr>
                      <th class="text-left text-[10px]">Sale Ref</th>
                      <th class="text-left text-[10px]">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('date')}>Date <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-left text-[10px]">Customer</th>
                      <th class="text-right text-[10px]">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('revenue')}>Revenue <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-right text-[10px]">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('cogs')}>COGS <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-right text-[10px]">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('profit')}>Profit <ArrowUpDown size={10} /></button>
                      </th>
                      <th class="text-right text-[10px]">
                        <button class="inline-flex items-center gap-1" onclick={() => toggleSort('margin')}>Margin <ArrowUpDown size={10} /></button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each pagedBills as bill}
                      <tr>
                        <td><a href="/history/{bill.id}" class="font-mono text-[12px] text-[var(--text-2)] hover:text-[var(--primary)]">{bill.ref}</a></td>
                        <td class="whitespace-nowrap text-[12px]">{formatDateTime(bill.date)}</td>
                        <td class="text-[12px] text-[var(--text-2)]">{bill.customer ?? '—'}</td>
                        <td class="text-right tabular-nums">{formatCurrencyCompact(bill.revenue)}</td>
                        <td class="text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(bill.cogs)}</td>
                        <td class="text-right font-semibold tabular-nums" style="color:{bill.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                          {bill.profit >= 0 ? '+' : ''}{formatCurrencyCompact(bill.profit)}
                        </td>
                        <td class="text-right"><MarginBadge value={bill.margin} /></td>
                      </tr>
                    {/each}
                  </tbody>
                  <tfoot>
                    <tr class="border-t-2 border-[var(--border)]">
                      <td colspan="3" class="font-semibold text-[12px]">Total ({filteredBills.length} bills)</td>
                      <td class="text-right font-bold tabular-nums">{formatCurrencyCompact(runningTotal.revenue)}</td>
                      <td class="text-right font-bold tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(runningTotal.cogs)}</td>
                      <td class="text-right font-bold tabular-nums" style="color:{runningTotal.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                        {runningTotal.profit >= 0 ? '+' : ''}{formatCurrencyCompact(runningTotal.profit)}
                      </td>
                      <td class="text-right">
                        <MarginBadge value={runningTotal.revenue > 0 ? Math.round(((runningTotal.profit / runningTotal.revenue) * 100) * 10) / 10 : 0} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {#if billTotalPages > 1}
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  <span class="text-[11px] text-[var(--text-3)]">Page {billPage + 1} of {billTotalPages}</span>
                  <div class="flex gap-1.5">
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
</div>
