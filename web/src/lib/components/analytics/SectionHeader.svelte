<script lang="ts">
  let {
    icon,
    title,
    subtitle,
    accent = 'primary',
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    accent?: string;
  } = $props();
</script>

<div class="flex items-center gap-2">
  <div
    class="w-7 h-7 rounded-lg flex items-center justify-center"
    style="background:color-mix(in srgb, var(--{accent}) 14%, transparent)"
  >
    <svelte:component this={icon} size={14} strokeWidth={2} style="color:var(--{accent})" />
  </div>
  <div>
    <h3 class="font-semibold text-[13.5px] text-[var(--text)] tracking-tight">{title}</h3>
    {#if subtitle}
      <p class="text-[10px] text-[var(--text-3)]">{subtitle}</p>
    {/if}
  </div>
</div>
