<script lang="ts">
  export let label: string | undefined = undefined;
  export let value: string;
  export let placeholder: string | undefined = undefined;
  export let className: string = "";
  export let isDark: boolean;

  const id = `tech-input-${Math.random()}`;
</script>

<div class={`flex flex-col gap-1 w-full ${className}`}>
  {#if label}
    <label {id} class="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 {isDark ? 'text-slate-400' : 'text-slate-500'}">
      {label}
    </label>
  {/if}
  <input 
    {id}
    type="text" 
    bind:value={value}
    {placeholder}
    class="h-8 px-2 border-2 font-mono text-xs focus:outline-none transition-colors
      {isDark 
        ? 'bg-[#09090b] border-slate-700 text-slate-200 focus:border-slate-500 placeholder:text-slate-700' 
        : 'bg-white border-slate-300 text-slate-800 focus:border-slate-800 placeholder:text-slate-300'}
    "
  />
</div>
