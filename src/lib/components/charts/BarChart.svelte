<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
  import { formatCurrency, formatCurrencyMajor } from '$lib/utils/format';
  import { mountChartTooltip, type ChartTooltipHandle } from '$lib/utils/chartTooltip';
  import { setupTooltipAutoHide } from '$lib/utils/chartTooltipAutoHide';

  let {
    data           = [],
    labels         = [],
    color          = 'var(--primary)',
    height         = 220,
    borderRadius   = 6,
    yFormat        = 'number',
    showYAxis      = true,
    highlightLast  = false,
    showYAxisLabel = '',
  }: {
    data?:           number[];
    labels?:         string[];
    color?:          string;
    height?:         number | string;
    borderRadius?:   number;
    yFormat?:        'number' | 'currency' | 'count';
    showYAxis?:      boolean;
    highlightLast?:  boolean;
    showYAxisLabel?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart:  ChartType | null = null;
  let observer: MutationObserver;
  let ChartCtor: typeof ChartType | null = null;
  let tooltip: ChartTooltipHandle | null = null;
  let disposeAutoHide: (() => void) | null = null;

  function css(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function resolveColor(c: string): string {
    const m = c.match(/^var\((--[^)]+)\)$/);
    return m ? css(m[1]) : c;
  }
  function px(h: number | string): string {
    return typeof h === 'number' ? `${h}px` : h;
  }
  function fmt(n: number): string {
    if (yFormat === 'currency') {
      return formatCurrencyMajor(n, { decimals: 1 });
    }
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }
  function tooltipFmt(n: number): string {
    if (yFormat === 'currency') return formatCurrency(n);
    return n.toLocaleString();
  }

  function hideTooltip() {
    tooltip?.destroy();
    tooltip = null;
  }

  function externalTooltip(context: any) {
    const { chart: c, tooltip: t } = context;
    if (!t || t.opacity === 0 || !c || !canvas) {
      hideTooltip();
      return;
    }

    const idx = t.dataPoints?.[0]?.dataIndex ?? 0;
    const value = data[idx] ?? 0;
    const label = labels[idx] ?? '';

    const html = `
      <div style="padding: 2px 0 0;">
        <div style="color: var(--text-3); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">${label}</div>
        <div style="color: var(--text); font-weight: 700; font-size: 14px; font-variant-numeric: tabular-nums;">${tooltipFmt(value)}</div>
      </div>
    `;

    if (tooltip) {
      tooltip.reposition({ canvas, caretX: t.caretX, caretY: t.caretY, placement: 'auto' });
      tooltip.el.innerHTML = html;
    } else {
      tooltip = mountChartTooltip(html, {
        canvas,
        caretX: t.caretX,
        caretY: t.caretY,
        placement: 'auto',
      });
    }
  }

  function buildConfig(): ChartConfiguration<'bar'> {
    const barColor = resolveColor(color);
    const text3    = css('--text-3');
    const border   = css('--border');

    const colors = data.map((_, i) => {
      if (!highlightLast) return barColor;
      return i === data.length - 1 ? barColor : barColor + '40';
    });

    const hoverColors = data.map((_, i) => {
      if (!highlightLast) return barColor + 'CC';
      return i === data.length - 1 ? barColor + 'CC' : barColor + '55';
    });

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          hoverBackgroundColor: hoverColors,
          borderRadius: { topLeft: borderRadius, topRight: borderRadius, bottomLeft: 0, bottomRight: 0 } as any,
          borderSkipped: false,
          maxBarThickness: 40,
          categoryPercentage: 0.72,
          barPercentage: 0.88,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 14, right: 6, bottom: 6, left: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: externalTooltip as any,
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            display: showYAxis,
            beginAtZero: true,
            grid:  { color: border + '25', lineWidth: 1 },
            border: { display: false },
            ticks: {
              color:   text3,
              font:    { size: 10, weight: 500 },
              padding: 10,
              maxTicksLimit: 5,
              callback: (v) => fmt(v as number),
            },
          },
          x: {
            grid:  { display: false },
            border: { display: false },
            ticks: {
              color: text3,
              font:  { size: 10, weight: 500 },
              padding: 6,
              maxRotation: 0,
              autoSkipPadding: 14,
            },
          },
        },
      },
    };
  }

  function rebuild() {
    if (!ChartCtor || !canvas) return;
    chart?.destroy();
    chart = new ChartCtor(canvas, buildConfig());
  }

  onMount(async () => {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    ChartCtor = Chart;
    rebuild();
    observer = new MutationObserver(rebuild);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    disposeAutoHide = setupTooltipAutoHide(canvas, hideTooltip);
  });

  $effect(() => {
    const _data   = data;
    const _labels = labels;
    const _color  = color;
    if (!chart) return;

    const barColor = resolveColor(_color);
    const colors = _data.map((_, i) => {
      if (!highlightLast) return barColor;
      return i === _data.length - 1 ? barColor : barColor + '40';
    });

    chart.data.labels = _labels;
    chart.data.datasets[0].data               = _data;
    chart.data.datasets[0].backgroundColor    = colors as any;
    chart.update('active');
  });

  onDestroy(() => {
    disposeAutoHide?.();
    hideTooltip();
    chart?.destroy();
    observer?.disconnect();
  });
</script>

<div class="relative" style="height: {px(height)};">
  <canvas bind:this={canvas}></canvas>
</div>
