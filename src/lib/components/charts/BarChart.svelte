<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
  import { formatCurrencyMajor } from '$lib/utils/format';

  let {
    data           = [],
    labels         = [],
    color          = 'var(--primary)',
    height         = 220,
    borderRadius   = 6,
    yFormat        = 'number',
    showYAxis      = true,
    highlightLast  = false,
  }: {
    data?:           number[];
    labels?:         string[];
    color?:          string;
    height?:         number | string;
    borderRadius?:   number;
    yFormat?:        'number' | 'currency' | 'count';
    showYAxis?:      boolean;
    highlightLast?:  boolean;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart:  ChartType | null = null;
  let observer: MutationObserver;
  let ChartCtor: typeof ChartType | null = null;

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

  function buildConfig(): ChartConfiguration<'bar'> {
    const barColor = resolveColor(color);
    const text3    = css('--text-3');
    const border   = css('--border');
    const surface  = css('--surface');

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
            enabled: true,
            backgroundColor: surface,
            borderColor: border,
            borderWidth: 1,
            titleColor: css('--text'),
            bodyColor: text3,
            padding: { top: 10, bottom: 10, left: 14, right: 14 },
            cornerRadius: 10,
            titleFont: { size: 11, weight: 600 },
            bodyFont:  { size: 11, weight: 500 },
            displayColors: true,
            boxPadding: 6,
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
    chart?.destroy();
    observer?.disconnect();
  });
</script>

<div class="relative" style="height: {px(height)};">
  <canvas bind:this={canvas}></canvas>
</div>
