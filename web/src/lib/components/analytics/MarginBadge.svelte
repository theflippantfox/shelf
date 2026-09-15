<script lang="ts">
  import { marginBg, marginTone } from '$lib/utils/analyticsHelpers';

  let { value }: { value: number | null | undefined } = $props();
</script>

{#if value != null}
  <span
    class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums {marginTone(value)}"
    style="background:{marginBg(value)}"
  >
    {value.toFixed(1)}%
  </span>
{:else}
  <span class="text-[var(--text-3)]">—</span>
{/if}
