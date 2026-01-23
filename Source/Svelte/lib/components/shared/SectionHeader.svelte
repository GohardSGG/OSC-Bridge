<script lang="ts">
  import type { SvelteComponent, ComponentType } from "svelte";

  export let label: string;
  export let icon: ComponentType<SvelteComponent>;
  export let count: number | undefined = undefined;
  export let isDark: boolean;
  export let title: string = "";
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  on:dblclick
  {title}
  class="group relative h-6 border-y flex items-center justify-between px-3 select-none cursor-pointer transition-colors {isDark
    ? 'bg-[#1e1e22] border-slate-700 hover:bg-[#27272a]'
    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}"
>
  <div
    class="flex items-center gap-1.5 {isDark
      ? 'text-slate-400'
      : 'text-slate-500'}"
  >
    <svelte:component this={icon} size={10} />
    <span class="text-[9px] font-bold uppercase tracking-widest">{label}</span>
  </div>
  {#if count !== undefined}
    <span
      class="text-[9px] px-1 rounded font-mono {isDark
        ? 'bg-slate-800 text-slate-400'
        : 'bg-slate-200 text-slate-600'}"
    >
      {count}
    </span>
  {/if}
</div>
