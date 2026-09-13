<script lang="ts">
  import { ArrowUp, ArrowDown, Minus } from 'lucide-svelte';
  import { trendBg, trendTone, trendArrow, type TrendDir } from '$lib/utils/analyticsHelpers';

  let { direction, label }: { direction: TrendDir; label: string } = $props();
  const Icon = $derived(trendArrow(direction));
</script>

<span
  class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
  style="background:{trendBg(direction)}; color:{trendTone(direction)}"
>
  <Icon size={10} strokeWidth={2.5} />
  {label}
</span>
