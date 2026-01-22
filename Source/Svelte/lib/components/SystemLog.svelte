<script lang="ts">
  import { t } from "svelte-i18n";
  import { isDarkMode, systemLogs } from "$lib/stores/stores";
  import Activity from "$lib/icons/Activity.svelte";
  import Trash2 from "$lib/icons/Trash2.svelte";

  $: textMuted = $isDarkMode ? "text-slate-500" : "text-slate-400";

  // Helper to handle i18n interpolation safely
  function getLogMessage(log: any) {
    if (log.msg) return log.msg;
    // Explicitly cast to any to satisfy type checker
    const values = (log.values || {}) as any;
    return $t(log.key || "", { values });
  }
</script>

<div
  class="flex-1 flex flex-col min-h-0 {$isDarkMode
    ? 'bg-[#111113]'
    : 'bg-[#fcfcfc]'}"
>
  <div
    class="h-6 border-b px-3 flex items-center justify-between shrink-0 {$isDarkMode
      ? 'bg-[#18181b] border-slate-800'
      : 'bg-slate-100 border-slate-200'}"
  >
    <span
      class="text-[9px] font-bold uppercase flex items-center gap-2 {textMuted}"
    >
      <Activity size={10} />
      {$t("left_panel.system_title")}
    </span>
    <Trash2
      on:click={() => systemLogs.set([])}
      size={10}
      class="{textMuted} hover:text-slate-500 cursor-pointer"
    />
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
          {getLogMessage(log)}
        </span>
      </div>
    {/each}
  </div>
</div>
