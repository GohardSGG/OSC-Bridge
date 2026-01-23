<script lang="ts">
  export let label: string | undefined = undefined;
  export let value: string;
  export let placeholder: string | undefined = undefined;
  export let className: string = "";
  export let inputClass: string = "";
  export let isDark: boolean;

  const id = `tech-input-${Math.random()}`;
</script>

<div class={`flex flex-col gap-1 w-full ${className}`}>
  {#if label}
    <label
      for={id}
      class="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 {isDark
        ? 'text-slate-400'
        : 'text-slate-500'}"
    >
      {label}
    </label>
  {/if}
  <input
    {id}
    type="text"
    bind:value
    {placeholder}
    class="h-8 px-2 border-2 font-mono text-xs focus:outline-none transition-all duration-200 rounded-sm
      focus:scale-[1.02] focus:shadow-md focus:z-10 relative
      {isDark
      ? 'bg-[#09090b] border-slate-700 text-slate-200 focus:border-emerald-500/50 placeholder:text-slate-700 hover:border-slate-600'
      : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500/50 placeholder:text-slate-300 hover:border-slate-400'}
      {inputClass}
    "
  />
</div>
