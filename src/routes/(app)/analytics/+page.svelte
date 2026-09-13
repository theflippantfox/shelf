<script lang="ts">
  import { formatCurrency, formatCurrencyCompact, formatDateTime } from '$lib/utils/format';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { page as pageState } from '$app/state';
  import KpiCard from '$lib/components/ui/KpiCard.svelte';
  import AreaChart from '$lib/components/charts/AreaChart.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import Heatmap from '$lib/components/charts/Heatmap.svelte';
  import DynamicIcon from '$lib/components/ui/DynamicIcon.svelte';
  import PeriodSelector from '$lib/components/analytics/PeriodSelector.svelte';
  import SectionHeader from '$lib/components/analytics/SectionHeader.svelte';
  import TrendBadge from '$lib/components/analytics/TrendBadge.svelte';
  import MarginBadge from '$lib/components/analytics/MarginBadge.svelte';
  import {
    TrendingUp, Users, BarChart3, PieChart, ShoppingCart,
    Calendar, Package, Banknote, Trophy, Activity,
    Search, ArrowUpDown,
    ChevronLeft, ChevronRight, FileText, Receipt,
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

  // P&L sub-tab
  let pnlTab = $state<'calendar' | 'report' | 'bills'>('calendar');
  let expandedDate = $state<string | null>(null);

  // Bills: search, sort, pagination
  let billSearch = $state('');
  let billSortKey = $state<'date' | 'revenue' | 'cogs' | 'profit' | 'margin'>('date');
  let billSortDir = $state<'asc' | 'desc'>('desc');
  let billPage = $state(0);
  const BILL_PAGE_SIZE = 50;

  /* ── presets ───────────────────────────────────────────────────────── */
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

    // 1. IDB cache — instant, non-blocking
    readAnalyticsCache(cacheKey).then((cached: any) => {
      if (cached?.analytics && !analytics) {
        analytics = cached.analytics;
      }
    });

    // 2. API fetch — non-blocking
    fetch(`/api/analytics${search}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.analytics) {
          analytics = json.analytics;
          writeAnalyticsCache(cacheKey, json);
        }
      })
      .catch(() => {});
  }

  async function loadPnl(search: string) {
    fetch(`/api/analytics/pnl${search}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.pnl) pnl = json.pnl;
      })
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
    if (browser) {
      loadAnalytics(search);
      if (activeTab === 'pnl') loadPnl(search);
    }
  }

  function switchTab(tab: 'overview' | 'pnl') {
    activeTab = tab;
    if (tab === 'pnl' && !pnl) {
      loadPnl(currentSearch);
    }
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
  const topProduct = $derived(analytics?.products?.byRevenue?.[0] ?? null);
  const topPayment = $derived(paymentRows[0] ?? null);

  const trendLabels = $derived(trend.map((t: any) => t.label));
  const trendDatasets = $derived(
    activeMetric === 'revenue'
      ? [{ label: 'Revenue', data: trend.map((t: any) => t.current ?? 0) }]
      : [
          {
            label: activeMetric === 'transactions' ? 'Transactions' : 'Avg Order',
            data: trend.map((t: any) =>
              activeMetric === 'transactions' ? (t.txns ?? 0) : (t.avgOrder ?? 0),
            ),
          },
        ],
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
      ? bills.filter(
          (b: any) =>
            b.ref.toLowerCase().includes(q) ||
            (b.customer ?? '').toLowerCase().includes(q),
        )
      : bills;

    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      switch (billSortKey) {
        case 'date':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'revenue':
          cmp = a.revenue - b.revenue;
          break;
        case 'cogs':
          cmp = a.cogs - b.cogs;
          break;
        case 'profit':
          cmp = a.profit - b.profit;
          break;
        case 'margin':
          cmp = a.margin - b.margin;
          break;
      }
      return billSortDir === 'desc' ? -cmp : cmp;
    });
  });

  const pagedBills = $derived(
    filteredBills.slice(billPage * BILL_PAGE_SIZE, (billPage + 1) * BILL_PAGE_SIZE),
  );
  const billTotalPages = $derived(Math.ceil(filteredBills.length / BILL_PAGE_SIZE));

  const runningTotal = $derived({
    revenue: filteredBills.reduce((s: number, b: any) => s + b.revenue, 0),
    cogs: filteredBills.reduce((s: number, b: any) => s + b.cogs, 0),
    profit: filteredBills.reduce((s: number, b: any) => s + b.profit, 0),
  });

  function toggleSort(key: typeof billSortKey) {
    if (billSortKey === key) {
      billSortDir = billSortDir === 'desc' ? 'asc' : 'desc';
    } else {
      billSortKey = key;
      billSortDir = 'desc';
    }
    billPage = 0;
  }

  /* ── helpers ────────────────────────────────────────────────────────── */
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
  <!-- Header -->
  <div class="flex items-end justify-between gap-3 mb-5">
    <div class="flex-1 min-w-0">
      <h1 class="text-[22px] md:text-[26px] font-semibold text-[var(--text)] tracking-tight">
        Analytics
      </h1>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="inline-flex gap-1 bg-[var(--surface2)] p-1 rounded-lg mb-5">
    <button
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all"
      style="background:{activeTab === 'overview' ? 'var(--primary)' : 'transparent'}; color:{activeTab === 'overview' ? 'var(--primary-fg)' : 'var(--text-2)'}"
      onclick={() => switchTab('overview')}
    >
      Overview
    </button>
    <button
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all"
      style="background:{activeTab === 'pnl' ? 'var(--primary)' : 'transparent'}; color:{activeTab === 'pnl' ? 'var(--primary-fg)' : 'var(--text-2)'}"
      onclick={() => switchTab('pnl')}
    >
      P&L Report
    </button>
  </div>

  <!-- Period selector -->
  <PeriodSelector {presets} active={period?.preset ?? '30d'} onchange={changePeriod} />

  {#if !analytics}
    <div class="surface-card flex flex-col items-center justify-center h-64 text-[var(--text-3)] anim-in">
      <div
        class="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3"
        aria-hidden="true"
      ></div>
      <p class="text-[13px] font-semibold text-[var(--text)]">Crunching your numbers</p>
    </div>
  {:else}
    {@const hasData =
      (kpis?.transactions?.current ?? 0) > 0 || (kpis?.revenue?.current ?? 0) > 0}

    <div class="space-y-6 anim-stagger">
      {#if !hasData}
        <div class="surface-card flex flex-col items-center justify-center text-center py-14 px-5 anim-in">
          <div
            class="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style="background: color-mix(in srgb, var(--primary) 14%, transparent);"
          >
            <BarChart3 size={24} strokeWidth={1.5} style="color:var(--primary)" />
          </div>
          <p class="text-[15px] font-semibold text-[var(--text)]">No data for this period</p>
          <p class="text-[12.5px] text-[var(--text-3)] mt-1 max-w-sm leading-relaxed">
            Once you start ringing up sales, your revenue, profit, and trends will show up here.
          </p>
          <a href="/sale" class="btn btn-primary mt-4">
            <ShoppingCart size={14} strokeWidth={2} />
            Make your first sale
          </a>
        </div>
      {/if}

      {#if hasData && activeTab === 'overview'}
        <!-- ── SUMMARY CHIPS ────────────────────────────────────────────── -->
        <div class="surface-card-flat p-3 flex flex-wrap gap-x-4 gap-y-2 items-center text-xs">
          <span class="inline-flex items-center gap-1.5">
            <Activity size={12} strokeWidth={2} class="text-[var(--text-3)]" />
            <span class="text-[var(--text-3)]">Activity</span>
            <span class="font-semibold">{kpis.transactions.current} sales</span>
          </span>
          <span class="text-[var(--text-3)]">·</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="text-[var(--text-3)]">Avg order</span>
            <span class="font-semibold">{formatCurrencyCompact(kpis.avgOrder.current)}</span>
          </span>
          <span class="text-[var(--text-3)]">·</span>
          <span class="inline-flex items-center gap-1.5">
            <Users size={12} strokeWidth={2} class="text-[var(--text-3)]" />
            <span class="font-semibold">{uniqueBuyers}</span>
            <span class="text-[var(--text-3)]">buyers</span>
          </span>
          {#if topProduct}
            <span class="text-[var(--text-3)]">·</span>
            <span class="inline-flex items-center gap-1.5">
              <Trophy size={12} strokeWidth={2} style="color:var(--gold)" />
              <span class="text-[var(--text-3)]">Top product</span>
              <span class="font-semibold truncate max-w-[160px]">{topProduct.name}</span>
            </span>
          {/if}
          {#if topPayment}
            <span class="text-[var(--text-3)]">·</span>
            <span class="inline-flex items-center gap-1.5">
              <span class="text-[var(--text-3)]">Top method</span>
              <span class="font-semibold">{topPayment.label}</span>
            </span>
          {/if}
        </div>

      <!-- ── KPIs ──────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-fade">
        <KpiCard
          label="Revenue"
          icon="TrendingUp"
          value={formatCurrencyCompact(kpis.revenue.current)}
          trend={kpis.revenue.delta?.pct
            ? { direction: kpis.revenue.delta.direction, label: `${Math.abs(kpis.revenue.delta.pct)}%` }
            : undefined}
          sub="vs prev period"
        />
        <KpiCard
          label="Transactions"
          icon="ShoppingBag"
          value={String(kpis.transactions.current)}
          trend={kpis.transactions.delta?.pct
            ? { direction: kpis.transactions.delta.direction, label: `${Math.abs(kpis.transactions.delta.pct)}%` }
            : undefined}
          sub="vs prev period"
        />
        <KpiCard
          label="Avg Order"
          icon="BarChart3"
          value={formatCurrencyCompact(kpis.avgOrder.current)}
          trend={kpis.avgOrder.delta?.pct
            ? { direction: kpis.avgOrder.delta.direction, label: `${Math.abs(kpis.avgOrder.delta.pct)}%` }
            : undefined}
          sub="vs prev period"
        />
        {#if kpis.margin}
          <KpiCard
            label="Gross Margin"
            icon="Percent"
            value={`${kpis.margin.current.toFixed(1)}%`}
            trend={kpis.margin.delta?.pp
              ? { direction: kpis.margin.delta.direction, label: `${Math.abs(kpis.margin.delta.pp)}pp` }
              : undefined}
            sub="vs prev period"
          />
        {/if}
      </div>

      <!-- ── Credit / Receivables ──────────────────────────────────────── -->
      {#if analytics?.outstanding && analytics.outstanding.total > 0}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Outstanding Receivables"
            icon="Clock"
            value={formatCurrencyCompact(analytics.outstanding.total)}
            sub={`${analytics.outstanding.byCustomer.length} ${analytics.outstanding.byCustomer.length === 1 ? 'customer' : 'customers'}`}
          />
          <div class="surface-card p-4 md:p-5 space-y-2.5">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              By Status
            </p>
            <div class="flex items-center justify-between text-xs">
              <span class="text-[var(--text-2)] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[var(--crimson)]"></span>
                Pending (full)
              </span>
              <span class="font-semibold tabular-nums">
                {formatCurrencyCompact(analytics.outstanding.byStatus.pending ?? 0)}
              </span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-[var(--text-2)] flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[var(--gold)]"></span>
                Partial
              </span>
              <span class="font-semibold tabular-nums">
                {formatCurrencyCompact(analytics.outstanding.byStatus.partial ?? 0)}
              </span>
            </div>
            <div class="h-px bg-[var(--border)] my-1.5"></div>
            <div class="flex items-center justify-between text-[10px] text-[var(--text-3)]">
              <span>Total outstanding</span>
              <span class="font-bold tabular-nums" style="color:var(--gold)">
                {formatCurrencyCompact(analytics.outstanding.total)}
              </span>
            </div>
          </div>
          <div class="surface-card p-4 md:p-5 space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
              Top Customers with Credit
            </p>
            {#if analytics.outstanding.byCustomer.length === 0}
              <p class="text-xs text-[var(--text-3)]">No customers with outstanding credit.</p>
            {:else}
              <ul class="space-y-1.5">
                {#each analytics.outstanding.byCustomer.slice(0, 4) as c (c.id)}
                  <li class="flex items-center justify-between text-xs">
                    <a
                      href="/customers/{c.id}"
                      class="font-medium text-[var(--text)] truncate hover:text-[var(--primary)]"
                    >
                      {c.name}
                    </a>
                    <span class="font-semibold tabular-nums whitespace-nowrap" style="color:var(--gold)">
                      {formatCurrencyCompact(c.outstanding)}
                    </span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      {/if}

      <!-- ── Profit + Inventory ────────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        {#if grossProfit}
          <div class="surface-card p-4 md:p-5 space-y-3">
            <div class="flex items-center justify-between">
              <SectionHeader icon={Banknote} title="Gross Profit" accent="cobalt" />
              {#if grossProfit.delta}
                <TrendBadge
                  direction={grossProfit.delta.direction}
                  label={`${Math.abs(grossProfit.delta.pct)}%`}
                />
              {/if}
            </div>
            <p class="text-xl font-bold tabular-nums">{formatCurrencyCompact(grossProfit.current)}</p>
            <p class="text-[10px] text-[var(--text-3)]">
              vs {formatCurrencyCompact(grossProfit.previous)} prev period
            </p>
            {#if grossProfit.coverage !== undefined && grossProfit.coverage < 80}
              <p class="text-[10px] text-[var(--gold-fg)]" title="Items with cost data available">
                ⚠ Cost data on {grossProfit.coverage}% of items
              </p>
            {/if}
          </div>
        {/if}

        {#if stockValue}
          <div class="surface-card p-4 md:p-5 space-y-3">
            <div class="flex items-center justify-between">
              <SectionHeader icon={Package} title="Inventory Value" accent="primary" />
              <span class="text-[10px] font-semibold tabular-nums" style="color:var(--cobalt-fg)">
                {stockValue.potentialMargin.toFixed(1)}% margin
              </span>
            </div>
            <div class="flex items-end justify-between gap-2">
              <div>
                <p class="text-[10px] text-[var(--text-3)]">At retail</p>
                <p class="text-lg font-bold tabular-nums leading-tight">
                  {formatCurrencyCompact(stockValue.retailValue)}
                </p>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-[var(--text-3)]">At cost</p>
                <p class="text-sm font-semibold tabular-nums leading-tight text-[var(--text-2)]">
                  {formatCurrencyCompact(stockValue.costValue)}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex-1 h-1.5 rounded-full bg-[var(--surface2)] overflow-hidden">
                <div
                  class="h-full rounded-full"
                  style="width:{Math.min(100, stockValue.potentialMargin).toFixed(1)}%; background:var(--cobalt)"
                ></div>
              </div>
              <p class="text-[10px] text-[var(--text-3)] whitespace-nowrap">
                {stockValue.totalUnits.toLocaleString()} units
              </p>
            </div>
          </div>
        {/if}
      </div>

      <!-- ── Revenue Trend ─────────────────────────────────────────────── -->
      <div class="surface-card p-4 md:p-5 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <SectionHeader
            icon={TrendingUp}
            title="{activeMetric === 'revenue' ? 'Revenue Trend' : activeMetric === 'transactions' ? 'Transaction Volume' : 'Average Order Value'}"
          />
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
        <div class="h-72 w-full">
          <AreaChart
            labels={trendLabels}
            datasets={trendDatasets}
            yFormat={activeMetric === 'transactions' ? 'count' : 'currency'}
            height={288}
          />
        </div>
      </div>

      <!-- ── 12-Month Trend + Payment Methods ──────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="surface-card p-4 md:p-5 space-y-4 lg:col-span-2">
          <div class="flex items-center justify-between">
            <SectionHeader icon={BarChart3} title="12-Month Trend" subtitle="Rolling yearly revenue" accent="cobalt" />
            <span class="badge badge-neutral text-[10px]">
              {monthlyLabels.length} month{monthlyLabels.length === 1 ? '' : 's'}
            </span>
          </div>
          <div class="h-56 w-full">
            <BarChart
              labels={monthlyLabels}
              data={monthlyRevData}
              color="var(--cobalt)"
              height={224}
              yFormat="currency"
              highlightLast
            />
          </div>
        </div>

        <div class="surface-card p-4 md:p-5 space-y-4">
          <SectionHeader icon={PieChart} title="Payment Methods" />
          {#if paymentRows.length === 0}
            <p class="text-xs text-[var(--text-3)] py-8 text-center">No payments in this period.</p>
          {:else}
            {@const totalPaymentRev = paymentRows.reduce((s: number, p: any) => s + (p.revenue ?? 0), 0)}
            <div class="h-44 w-full">
              <DonutChart
                labels={paymentRows.map((pm: any) => pm.label)}
                data={paymentRows.map((pm: any) => pm.revenue ?? 0)}
                centerValue={formatCurrency(totalPaymentRev)}
                centerLabel="total"
              />
            </div>
            <div class="space-y-1.5 pt-2">
              {#each paymentRows as pm, i}
                <div class="flex items-center justify-between text-[12px]">
                  <span class="flex items-center gap-2 text-[var(--text-2)] truncate">
                    <span
                      class="w-2 h-2 rounded-sm shrink-0"
                      style="background:{['var(--primary)', 'var(--cobalt)', 'var(--gold)', 'var(--rose)', 'var(--crimson)', 'var(--teal)'][i % 6]}"
                    ></span>
                    {pm.label}
                  </span>
                  <span class="font-semibold tabular-nums shrink-0">{formatCurrency(pm.revenue)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- ── Sales Calendar + Busiest Times ────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div
          class="surface-card px-3 py-4 md:px-4 md:py-5 space-y-3 lg:col-span-1 flex flex-col"
        >
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <SectionHeader icon={Calendar} title="Sales Calendar" subtitle="This month · daily revenue" accent="teal" />
            {#if calendar?.hasData}
              <div class="flex items-center gap-2 text-[10px] text-[var(--text-3)]">
                <span class="font-semibold text-[var(--text)] tabular-nums"
                  >{formatCurrencyCompact(calendar.total)}</span
                >
                <span>in {calendar.monthLabel}</span>
              </div>
            {/if}
          </div>

          {#if !calendar}
            <div class="h-48 flex items-center justify-center text-[12px] text-[var(--text-3)]">
              No calendar data available.
            </div>
          {:else if !calendar.hasData}
            <div class="h-48 flex items-center justify-center text-[12px] text-[var(--text-3)]">
              No sales in {calendar.monthLabel}. Make your first sale to see it here.
            </div>
          {:else}
            {@const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']}
            <div class="flex items-center justify-between text-[11px] font-semibold text-[var(--text)]">
              <span>{calendar.monthLabel}</span>
              {#if calendar.bestDay}
                <span class="text-[9px] text-[var(--text-3)] font-normal">
                  Best: day {calendar.bestDay.date.slice(8)} · {formatCurrencyCompact(calendar.bestDay.value)}
                </span>
              {/if}
            </div>
            <div class="grid grid-cols-7 gap-1 text-[9px] text-[var(--text-3)] font-medium text-center">
              {#each dayLabels as l}
                <div>{l}</div>
              {/each}
            </div>
            <div
              class="grid grid-cols-7 gap-1 flex-1 min-h-0"
              style="grid-template-rows: repeat({calendar.weeks}, minmax(0, 1fr));"
            >
              {#each calendar.cells as c}
                {@const v = c.value}
                {@const intensity = v > 0 ? Math.max(0.18, v / (calendar.max || 1)) : 0}
                {#if c.date}
                  <div
                    class="rounded-md flex items-center justify-center text-[11px] font-semibold tabular-nums
                           transition-transform hover:scale-110 relative cursor-default min-h-0
                           {c.isToday ? 'ring-1 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : ''}"
                    style="background: {c.isFuture
                      ? 'transparent'
                      : v > 0
                        ? `color-mix(in srgb, var(--teal) ${Math.round(intensity * 100)}%, var(--surface2))`
                        : 'color-mix(in srgb, var(--surface2) 60%, var(--text-3) 8%)'};
                           border: {c.isFuture
                             ? '1px dashed color-mix(in srgb, var(--text-3) 35%, transparent)'
                             : '1px solid transparent'};
                           color: {c.isFuture
                             ? 'var(--text-3)'
                             : v > 0
                               ? 'var(--primary-fg)'
                               : 'var(--text-2)'};"
                    title={c.isFuture
                      ? `Day ${c.day} · ${c.date}\n(future — not yet)`
                      : `Day ${c.day} · ${c.date}\n${formatCurrency(v)} · ${c.count} sale${c.count === 1 ? '' : 's'}`}
                  >
                    {c.day}
                  </div>
                {:else}
                  <div aria-hidden="true"></div>
                {/if}
              {/each}
            </div>
            <div class="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-3)]">
              <span>Less</span>
              <div class="flex gap-0.5">
                {#each [0, 1, 2, 3, 4] as i}
                  <div
                    class="w-3 h-3 rounded-sm"
                    style="background:color-mix(in srgb, var(--teal) {15 + i * 18}%, var(--surface2))"
                  ></div>
                {/each}
              </div>
              <span>More</span>
            </div>
          {/if}
        </div>

        <div class="surface-card px-3 py-4 md:px-4 md:py-5 space-y-4 lg:col-span-3">
          <div class="flex items-center justify-between">
            <SectionHeader icon={Activity} title="Busiest Times" subtitle="Average revenue by hour-of-day and day-of-week" />
            <div class="flex items-center gap-1.5 text-[10px] text-[var(--text-3)]">
              <span>Less</span>
              <div class="flex gap-0.5">
                {#each [0, 1, 2, 3, 4] as i}
                  <div
                    class="w-3 h-3 rounded-sm"
                    style="background:color-mix(in srgb, var(--primary) {20 + i * 16}%, var(--surface2))"
                  ></div>
                {/each}
              </div>
              <span>More</span>
            </div>
          </div>
          <Heatmap
            values={heatmapValues}
            hours={Array.from({ length: 24 }, (_, i) => `${i}`)}
            fillHeight
          />
        </div>
      </div>

      <!-- ── Top Products ──────────────────────────────────────────────── -->
      <div class="surface-card p-4 md:p-5 space-y-4">
        <SectionHeader icon={Package} title="Top Products" subtitle="By revenue this period" />
        <div class="overflow-x-auto">
          <table class="tbl w-full">
            <thead>
              <tr>
                <th class="w-10 text-left">#</th>
                <th class="text-left">Product</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Units</th>
                <th class="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {#each analytics.products?.byRevenue ?? [] as product, i}
                <tr>
                  <td>
                    <span
                      class="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold font-mono"
                      style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}"
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td class="font-medium">{product.name ?? '—'}</td>
                  <td class="text-right font-semibold tabular-nums">{formatCurrency(product.revenue)}</td>
                  <td class="text-right tabular-nums text-[var(--text-2)]">{product.units}</td>
                  <td class="text-right">
                    <MarginBadge value={product.margin} />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Categories ────────────────────────────────────────────────── -->
      {#if (analytics.categories ?? []).length > 0}
        <div class="surface-card p-4 md:p-5 space-y-4">
          <SectionHeader icon={BarChart3} title="Categories" subtitle="Revenue, units, and margin by category" accent="cobalt" />
          <div class="overflow-x-auto">
            <table class="tbl w-full">
              <thead>
                <tr>
                  <th class="text-left">Category</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Units</th>
                  <th class="text-right">Avg Sale</th>
                  <th class="text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {#each analytics.categories as cat}
                  <tr>
                    <td class="font-medium">{cat.name}</td>
                    <td class="text-right font-semibold tabular-nums">{formatCurrency(cat.revenue)}</td>
                    <td class="text-right tabular-nums text-[var(--text-2)]">{cat.units}</td>
                    <td class="text-right tabular-nums text-[var(--text-2)]">
                      {formatCurrency(Math.round(cat.revenue / (cat.units || 1)))}
                    </td>
                    <td class="text-right">
                      <MarginBadge value={cat.margin} />
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}

      <!-- ── Customers ─────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="surface-card p-4 md:p-5 space-y-4">
          <SectionHeader icon={Users} title="Customers" subtitle="{uniqueBuyers} unique buyers" />
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg p-3 text-center" style="background:color-mix(in srgb, var(--gold) 12%, transparent)">
              <p class="text-[10px] font-bold uppercase tracking-wide" style="color:var(--gold-fg)">VIP</p>
              <p class="text-lg font-bold tabular-nums mt-1">{customerTiers?.vip ?? 0}</p>
            </div>
            <div class="rounded-lg p-3 text-center" style="background:color-mix(in srgb, var(--primary) 10%, transparent)">
              <p class="text-[10px] font-bold uppercase tracking-wide">Regular</p>
              <p class="text-lg font-bold tabular-nums mt-1">{customerTiers?.regular ?? 0}</p>
            </div>
            <div class="rounded-lg p-3 text-center" style="background:var(--surface2)">
              <p class="text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">New</p>
              <p class="text-lg font-bold tabular-nums mt-1">{customerTiers?.new ?? 0}</p>
            </div>
          </div>
          <p class="text-[10px] text-[var(--text-3)] text-center">Tiers based on lifetime spend</p>
        </div>

        <div class="surface-card p-4 md:p-5 md:col-span-2 space-y-4">
          <SectionHeader icon={Trophy} title="Top Customers" subtitle="By spend this period" accent="gold" />
          <div class="overflow-x-auto">
            <table class="tbl w-full">
              <thead>
                <tr>
                  <th class="w-10 text-left">#</th>
                  <th class="text-left">Name</th>
                  <th class="text-right">Spent</th>
                  <th class="text-right">Visits</th>
                </tr>
              </thead>
              <tbody>
                {#each leaderboard as customer, i}
                  <tr>
                    <td>
                      <span
                        class="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold font-mono"
                        style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}"
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td class="font-medium">{customer.name ?? '—'}</td>
                    <td class="text-right font-semibold tabular-nums">{formatCurrency(customer.spent)}</td>
                    <td class="text-right tabular-nums text-[var(--text-2)]">{customer.visits}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/if}

      {#if hasData && activeTab === 'pnl'}
      <div class="space-y-4 anim-stagger">
        <!-- P&L sub-tabs -->
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

        {#if !pnl}
          <div class="surface-card flex flex-col items-center justify-center h-64 text-[var(--text-3)] anim-in">
            <div class="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden="true"></div>
            <p class="text-[13px] font-semibold text-[var(--text)]">Loading P&L data</p>
          </div>

        <!-- CALENDAR VIEW -->
        {/if}
        {#if pnl && pnlTab === 'calendar'}
          {@const cal = pnl.profitCalendar}
          <div class="space-y-4 anim-stagger">
            <div class="surface-card p-4 md:p-5">
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
                <div class="h-48 flex items-center justify-center text-[12px] text-[var(--text-3)]">
                  No sales data for {cal.monthLabel}.
                </div>
              {:else}
                {@const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']}
                <div class="grid grid-cols-7 gap-1 text-[9px] text-[var(--text-3)] font-medium text-center mb-1">
                  {#each dayLabels as l}
                    <div>{l}</div>
                  {/each}
                </div>
                <div class="grid grid-cols-7 gap-1" style="grid-template-rows: repeat({cal.weeks}, minmax(0, 1fr));">
                  {#each cal.cells as c}
                    {#if c.date}
                      <button
                        class="rounded-md flex flex-col items-center justify-center py-2 text-[11px] font-semibold tabular-nums
                               transition-all hover:scale-105 relative cursor-pointer min-h-[44px]
                               {c.isToday ? 'ring-1 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : ''}"
                        style="background: {c.isFuture ? 'transparent' : profitColor(c.profit, cal.max)};
                               border: {c.isFuture ? '1px dashed color-mix(in srgb, var(--text-3) 35%, transparent)' : '1px solid transparent'};"
                        title="{c.day} · {c.date}{c.isFuture ? '\n(future)' : `\nProfit: ${formatCurrency(c.profit)}\nRevenue: ${formatCurrency(c.revenue)}\nCOGS: ${formatCurrency(c.cogs)}\n${c.count} sale${c.count === 1 ? '' : 's'}`}"  
                        onclick={() => { expandedDate = expandedDate === c.date ? null : c.date; }}
                      >
                        <span>{c.day}</span>
                        {#if !c.isFuture && c.count > 0}
                          <span class="text-[8px] opacity-80">{formatCurrencyCompact(c.profit)}</span>
                        {/if}
                      </button>
                    {:else}
                      <div aria-hidden="true"></div>
                    {/if}
                  {/each}
                </div>

                <div class="flex items-center justify-between mt-3">
                  <div class="flex items-center gap-1.5 text-[10px] text-[var(--text-3)]">
                    <span>Loss</span>
                    <div class="flex gap-0.5">
                      {#each [0, 1, 2, 3] as i}
                        <div class="w-3 h-3 rounded-sm" style="background:color-mix(in srgb, var(--crimson) {20 + i * 22}%, var(--surface2))"></div>
                      {/each}
                    </div>
                    <span class="mx-1">|</span>
                    <div class="flex gap-0.5">
                      {#each [0, 1, 2, 3] as i}
                        <div class="w-3 h-3 rounded-sm" style="background:color-mix(in srgb, var(--teal) {20 + i * 22}%, var(--surface2))"></div>
                      {/each}
                    </div>
                    <span>Profit</span>
                  </div>
                </div>

                {#if expandedDate && cal.daySales?.[expandedDate]?.length}
                  <div class="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
                    <p class="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wide">Sales on {expandedDate}</p>
                    {#each cal.daySales[expandedDate] as s}
                      {@const profitSign = s.profit >= 0 ? 'teal' : 'crimson'}
                      <div class="flex items-center justify-between text-[12px] py-1 px-2 rounded-md bg-[var(--surface2)]">
                        <a href="/history/{s.saleId}" class="font-mono text-[var(--text-2)] hover:text-[var(--primary)]">{s.saleId.slice(0, 8)}</a>
                        <div class="flex items-center gap-3">
                          <span class="text-[var(--text-3)] tabular-nums">{formatCurrencyCompact(s.revenue)}</span>
                          <span class="font-semibold tabular-nums" style="color:var(--{profitSign}-fg)">{s.profit >= 0 ? '+' : ''}{formatCurrencyCompact(s.profit)}</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Revenue" icon="TrendingUp" display={formatCurrencyCompact(cal.totalRev)} sub={cal.monthLabel} />
              <KpiCard label="COGS" icon="Package" display={formatCurrencyCompact(cal.totalCogs)} sub="cost of goods" />
              <KpiCard label="Gross Profit" icon="Banknote"
                       display={formatCurrencyCompact(cal.totalProfit)}
                       iconColor={cal.totalProfit >= 0 ? 'var(--teal)' : 'var(--crimson)'}
                       sub={cal.monthLabel} />
              <KpiCard label="Margin" icon="Percent"
                       display={cal.totalRev > 0 ? `${(((cal.totalRev - cal.totalCogs) / cal.totalRev) * 100).toFixed(1)}%` : '—'}
                       sub="gross margin" />
            </div>
          </div>

        <!-- REPORT VIEW -->
        {/if}
        {#if pnl && pnlTab === 'report'}
          {@const k = pnl.kpis}
          <div class="space-y-4 anim-stagger">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Revenue" icon="TrendingUp"
                       display={formatCurrencyCompact(k.revenue.current)}
                       trend={k.revenue.delta?.pct ? { direction: k.revenue.delta.direction, label: `${k.revenue.delta.pct}%` } : undefined}
                       sub="vs prev period" />
              <KpiCard label="COGS" icon="Package"
                       display={formatCurrencyCompact(k.cogs.current)}
                       trend={k.cogs.delta?.pct ? { direction: k.cogs.delta.direction, label: `${k.cogs.delta.pct}%` } : undefined}
                       sub="vs prev period" />
              <KpiCard label="Gross Profit" icon="Banknote"
                       display={formatCurrencyCompact(k.profit.current)}
                       iconColor={k.profit.current >= 0 ? 'var(--teal)' : 'var(--crimson)'}
                       trend={k.profit.delta?.pct ? { direction: k.profit.delta.direction, label: `${k.profit.delta.pct}%` } : undefined}
                       sub="vs prev period" />
              <KpiCard label="Margin" icon="Percent"
                       display={`${k.margin.current.toFixed(1)}%`}
                       trend={k.margin.delta?.pct ? { direction: k.margin.delta.direction, label: `${k.margin.delta.pct}%` } : undefined}
                       sub="vs prev period" />
            </div>

            {#if k.coverage < 80}
              <div class="surface-card-flat p-3 text-[11px] text-[var(--gold-fg)] flex items-center gap-2">
                <span>⚠</span>
                <span>Cost data available for {k.coverage}% of line items. Margin figures may be understated.</span>
              </div>
            {/if}

            <!-- Day-by-day breakdown -->
            <div class="surface-card p-4 md:p-5 space-y-3">
              <h3 class="text-[13px] font-semibold text-[var(--text)]">Daily Breakdown</h3>
              {#if pnl.dailyRows.length === 0}
                <p class="text-xs text-[var(--text-3)] py-4 text-center">No sales data for this period.</p>
              {:else}
                <div class="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table class="tbl w-full">
                    <thead class="sticky top-0 bg-[var(--surface)]">
                      <tr>
                        <th class="text-left">Date</th>
                        <th class="text-right">Sales</th>
                        <th class="text-right">Revenue</th>
                        <th class="text-right">COGS</th>
                        <th class="text-right">Profit</th>
                        <th class="text-right">Margin</th>
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
                          <td class="text-right">
                            <MarginBadge value={row.margin} />
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>

            <!-- Top products by profit -->
            <div class="surface-card p-4 md:p-5 space-y-3">
              <h3 class="text-[13px] font-semibold text-[var(--text)]">Top Products by Profit</h3>
              {#if pnl.topProducts.length === 0}
                <p class="text-xs text-[var(--text-3)] py-4 text-center">No product data.</p>
              {:else}
                <div class="overflow-x-auto">
                  <table class="tbl w-full">
                    <thead>
                      <tr>
                        <th class="w-10 text-left">#</th>
                        <th class="text-left">Product</th>
                        <th class="text-right">Units</th>
                        <th class="text-right">Revenue</th>
                        <th class="text-right">COGS</th>
                        <th class="text-right">Profit</th>
                        <th class="text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each pnl.topProducts as p, i}
                        <tr>
                          <td>
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold font-mono"
                                  style="background:{i < 3 ? 'var(--gold-dim)' : 'var(--surface2)'}; color:{i < 3 ? 'var(--gold-fg)' : 'var(--text-3)'}">
                              {i + 1}
                            </span>
                          </td>
                          <td class="font-medium">{p.name}</td>
                          <td class="text-right tabular-nums text-[var(--text-2)]">{p.units}</td>
                          <td class="text-right tabular-nums">{formatCurrencyCompact(p.revenue)}</td>
                          <td class="text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(p.cogs)}</td>
                          <td class="text-right font-semibold tabular-nums" style="color:{p.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                            {p.profit >= 0 ? '+' : ''}{formatCurrencyCompact(p.profit)}
                          </td>
                          <td class="text-right">
                            <MarginBadge value={p.margin} />
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>

        <!-- BILL-BY-BILL VIEW -->
        {/if}
        {#if pnl && pnlTab === 'bills'}
          <div class="space-y-4 anim-stagger">
            <!-- Search -->
            <div class="surface-card p-3 flex items-center gap-2">
              <Search size={14} strokeWidth={2} class="text-[var(--text-3)] shrink-0" />
              <input
                type="text"
                placeholder="Search by sale ref or customer…"
                class="flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
                bind:value={billSearch}
                oninput={() => { billPage = 0; }}
              />
              {#if billSearch}
                <button class="text-[10px] text-[var(--text-3)] hover:text-[var(--text)]"
                        onclick={() => { billSearch = ''; billPage = 0; }}>Clear</button>
              {/if}
            </div>

            <div class="surface-card p-4 md:p-5">
              {#if filteredBills.length === 0}
                <p class="text-xs text-[var(--text-3)] py-6 text-center">No bills found.</p>
              {:else}
                <div class="overflow-x-auto">
                  <table class="tbl w-full">
                    <thead>
                      <tr>
                        <th class="text-left">Sale Ref</th>
                        <th class="text-left">
                          <button class="inline-flex items-center gap-1" onclick={() => toggleSort('date')}>Date <ArrowUpDown size={10} /></button>
                        </th>
                        <th class="text-left">Customer</th>
                        <th class="text-right">
                          <button class="inline-flex items-center gap-1" onclick={() => toggleSort('revenue')}>Revenue <ArrowUpDown size={10} /></button>
                        </th>
                        <th class="text-right">
                          <button class="inline-flex items-center gap-1" onclick={() => toggleSort('cogs')}>COGS <ArrowUpDown size={10} /></button>
                        </th>
                        <th class="text-right">
                          <button class="inline-flex items-center gap-1" onclick={() => toggleSort('profit')}>Profit <ArrowUpDown size={10} /></button>
                        </th>
                        <th class="text-right">
                          <button class="inline-flex items-center gap-1" onclick={() => toggleSort('margin')}>Margin <ArrowUpDown size={10} /></button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each pagedBills as bill}
                        <tr>
                          <td>
                            <a href="/history/{bill.id}" class="font-mono text-[12px] text-[var(--text-2)] hover:text-[var(--primary)]">{bill.ref}</a>
                          </td>
                          <td class="whitespace-nowrap text-[12px]">{formatDateTime(bill.date)}</td>
                          <td class="text-[12px] text-[var(--text-2)]">{bill.customer ?? '—'}</td>
                          <td class="text-right tabular-nums">{formatCurrencyCompact(bill.revenue)}</td>
                          <td class="text-right tabular-nums text-[var(--text-2)]">{formatCurrencyCompact(bill.cogs)}</td>
                          <td class="text-right font-semibold tabular-nums" style="color:{bill.profit >= 0 ? 'var(--teal-fg)' : 'var(--crimson-fg)'}">
                            {bill.profit >= 0 ? '+' : ''}{formatCurrencyCompact(bill.profit)}
                          </td>
                          <td class="text-right">
                            <MarginBadge value={bill.margin} />
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                    <tfoot>
                      <tr class="border-t-2 border-[var(--border)]">
                        <td colspan="3" class="font-semibold text-[12px]">Running Total ({filteredBills.length} bills)</td>
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
          </div>
        {/if}
      </div>
    {/if}

    </div>
  {/if}
</div>
