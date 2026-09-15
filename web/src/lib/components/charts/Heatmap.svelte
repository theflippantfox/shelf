<script lang="ts">
  import { formatCurrency } from '$lib/utils/format';

  let {
    values      = [],
    hours       = Array.from({ length: 24 }, (_, i) => `${i}:00`),
    days        = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    showHours   = true,
    format      = 'currency',
    fillHeight  = false,
    minWidth    = 0,
  }: {
    values?:      number[][];
    hours?:       string[];
    days?:        string[];
    showHours?:   boolean;
    format?:      'currency' | 'number';
    fillHeight?:  boolean;
    minWidth?:    number;
  } = $props();

  const maxVal = $derived(values.flat().reduce((m, v) => Math.max(m, v), 0) || 1);

  function intensity(value: number): number {
    if (maxVal === 0) return 0;
    return Math.max(0.05, value / maxVal);
  }

  function cellColor(value: number): string {
    if (value === 0) return 'var(--surface2)';
    const pct = Math.round(intensity(value) * 100);
    return `color-mix(in srgb, var(--primary) ${Math.max(pct, 5)}%, var(--surface2))`;
  }

  function cellBorder(value: number): string {
    if (value === 0) return '1px solid var(--border)';
    return '1px solid transparent';
  }

  function tooltip(value: number, day: string, hour: string): string {
    const formatted = format === 'currency' ? formatCurrency(value) : value.toLocaleString();
    return `${day} ${hour}: ${formatted}`;
  }

  const hourTicks = $derived(
    hours.map((h, i) => ({ label: i % 6 === 0 ? h.replace(':00', '') : '', idx: i })),
  );
</script>

<div class="overflow-x-auto {minWidth ? 'overflow-y-hidden' : 'overflow-y-visible'}">
  {#if values.length}
    <div style="min-width: {minWidth ? `${minWidth}px` : '0'};">
      {#if showHours}
        <div class="flex items-end gap-2 mb-2 pl-9">
          <div class="flex-1 relative" style="height:16px">
            {#each hourTicks as t}
              {#if t.label}
                <span
                  class="absolute text-[9px] font-semibold uppercase tracking-wider text-[var(--text-3)] -translate-x-1/2 tabular-nums"
                  style="left:calc({t.idx + 0.5} * (100% / 24))"
                >{t.label}</span>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      <div class="grid gap-1">
        {#each days as day, i}
          <div class="flex items-center gap-2">
            <span class="w-8 text-[10px] uppercase font-bold text-[var(--text-3)] shrink-0 tracking-wider">
              {day}
            </span>
            <div class="grid flex-1 gap-1"
                 style="grid-template-columns:repeat(24,minmax(0,1fr)); max-width: 95%;">
              {#each values[i] ?? [] as cell, j}
                <div
                  class="rounded-[3px] transition-all duration-150 cursor-default
                         hover:scale-110 hover:z-10 hover:shadow-lg
                         {fillHeight ? 'h-[22px]' : 'h-[14px]'}"
                  style="background-color: {cellColor(cell)}; border: {cellBorder(cell)};"
                  title={tooltip(cell, days[i], hours[j])}
                ></div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="text-[11px] text-[var(--text-3)] italic text-center py-6">
      No data available for this period.
    </div>
  {/if}
</div>
