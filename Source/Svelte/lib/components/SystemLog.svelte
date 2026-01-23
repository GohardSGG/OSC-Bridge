<script lang="ts">
  import { t } from "svelte-i18n";
  import { isDarkMode, systemLogs } from "$lib/stores/stores";
  import Activity from "$lib/icons/Activity.svelte";
  import Trash2 from "$lib/icons/Trash2.svelte";

  $: textMuted = $isDarkMode ? "text-slate-500" : "text-slate-400";
</script>

<div
  class="flex-1 flex flex-col min-h-0 {$isDarkMode
    ? 'bg-[#111113]'
    : 'bg-[#fcfcfc]'}"
>
  <div
    class="h-6 border-b px-3 flex items-center justify-between shrink-0 group select-none {$isDarkMode
      ? 'bg-[#18181b] border-slate-800'
      : 'bg-slate-100 border-slate-200'}"
  >
    <span
      class="text-[9px] font-bold uppercase flex items-center gap-1.5 transition-all duration-300 {textMuted}"
    >
      <div
        class="transition-transform duration-300 group-hover:scale-110 group-hover:text-emerald-400"
      >
        <Activity size={10} />
      </div>
      {$t("left_panel.system_title")}
    </span>
    <div
      class="transition-transform duration-200 hover:rotate-12 hover:scale-110 active:scale-95"
    >
      <Trash2
        on:click={() => systemLogs.set([])}
        size={10}
        class="{textMuted} hover:text-rose-500 cursor-pointer transition-colors"
      />
    </div>
  </div>
  <div class="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-[9px]">
    {#each $systemLogs.filter((log) => log && log.id != null) as log (log.id)}
      <div class="flex gap-1.5">
        <span class="text-slate-500">{log.time}</span>
        <!-- If log.msg exists, it's a raw message. Otherwise, use i18n. -->
        <span
          class="flex-1 leading-tight select-text cursor-text {$isDarkMode
            ? 'text-slate-400'
            : 'text-slate-600'}"
        >
          {#if log.msg}
            {log.msg}
          {:else}
            {$t(log.key || "", { values: log.values || {} })}
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>
