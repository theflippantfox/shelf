<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Chart as ChartType, ChartConfiguration } from 'chart.js';
  import { formatCurrencyMajor } from '$lib/utils/format';

  let {
    datasets = [],
    labels   = [],
    height   = 280,
    yFormat  = 'number',
  }: {
    datasets?: Array<{
      label: string;
      data: number[];
      color?: string;
      dashed?: boolean;
    }>;
    labels?:      string[];
    height?:      number | string;
    yFormat?:     'number' | 'currency' | 'count';
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart:  ChartType | null = null;
  let observer: MutationObserver;
  let ChartCtor: typeof ChartType | null = null;

  function css(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function px(h: number | string): string {
    return typeof h === 'number' ? `${h}px` : h;
  }
  function fmt(n: number): string {
    if (yFormat === 'currency') {
      const abs = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      if (abs >= 1_000_000) return sign + formatCurrencyMajor(abs / 1_000_000, { decimals: 1 }) + 'M';
      if (abs >= 1_000)     return sign + formatCurrencyMajor(abs / 1_000,     { decimals: 1 }) + 'k';
      return sign + formatCurrencyMajor(abs, { decimals: 0 });
    }
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }
  function buildConfig(): ChartConfiguration<'line'> {
    const text3  = css('--text-3');
    const border = css('--border');
    const surface = css('--surface');

    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => {
          const color = resolveColor(ds.color ?? (i === 0 ? 'var(--primary)' : 'var(--text-3)'));
          const ctx2d = canvas?.getContext('2d');
          let bg: string | CanvasGradient = color + '15';
          if (ctx2d) {
            const grad = ctx2d.createLinearGradient(0, 0, 0, 260);
            grad.addColorStop(0, color + '30');
            grad.addColorStop(0.4, color + '10');
            grad.addColorStop(1, color + '00');
            bg = grad;
          }
          return {
            label: ds.label,
            data: ds.data,
            borderColor: color,
            backgroundColor: bg,
            fill: i === 0 ? 'origin' : false,
            tension: 0.42,
            pointRadius: 0,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 3,
            borderWidth: 2.5,
            borderDash: ds.dashed ? [5, 5] : undefined,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 20, right: 10, bottom: 6, left: 0 } },
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
            display: true,
            beginAtZero: true,
            grid:  { color: border + '25', lineWidth: 1, drawTicks: false },
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
              autoSkipPadding: 16,
            },
          },
        },
      },
    };
  }

  function resolveColor(c: string): string {
    const m = c.match(/^var\((--[^)]+)\)$/);
    return m ? css(m[1]) : c;
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
    if (!chart) return;
    const _data   = datasets;
    const _labels = labels;
    chart.data.labels = _labels;
    chart.data.datasets.forEach((d, i) => {
      if (_data[i]) {
        d.data = _data[i].data;
        d.label = _data[i].label;
      }
    });
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
