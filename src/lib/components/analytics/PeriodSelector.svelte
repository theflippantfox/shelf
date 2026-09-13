<script lang="ts">
  interface Preset {
    label: string;
    value: string;
  }

  let { presets, active, onchange }: { presets: Preset[]; active: string; onchange: (preset: string) => void } = $props();
</script>

<div class="-mx-5 md:mx-0 mb-5 overflow-x-auto pb-1">
  <div class="flex gap-1.5 px-5 md:px-0 w-max">
    {#each presets as p}
      {@const isActive = active === p.value}
      <button
        class="btn btn-sm whitespace-nowrap transition-all {isActive ? 'btn-primary' : 'btn-secondary'}"
        onclick={() => onchange(p.value)}
      >
        {p.label}
      </button>
    {/each}
  </div>
</div>
