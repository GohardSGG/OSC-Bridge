<script lang="ts">
  import { t } from "svelte-i18n";
  import {
    isDarkMode,
    injectorAddress,
    injectorArgs,
  } from "$lib/stores/stores";
  import { sendOsc } from "$lib/bridge";
  import TechInput from "./shared/TechInput.svelte";
  import Terminal from "$lib/icons/Terminal.svelte";
  import Send from "$lib/icons/Send.svelte";

  $: titleText = $isDarkMode ? "text-slate-300" : "text-slate-800";
</script>

<div
  class="p-3 border-b-2 transition-colors {$isDarkMode
    ? 'bg-[#1e1e22] border-slate-800'
    : 'bg-white border-slate-200'}"
>
  <div class="mb-3 group cursor-default">
    <h2
      class="text-xs font-black flex items-center gap-1.5 uppercase tracking-wide transition-all duration-300 {titleText}"
    >
      <div
        class="transition-transform duration-300 group-hover:scale-110 group-hover:text-emerald-400"
      >
        <Terminal size={14} />
      </div>
      {$t("left_panel.injector_title")}
    </h2>
  </div>
  <div class="space-y-2">
    <TechInput
      label={$t("left_panel.address")}
      bind:value={$injectorAddress}
      placeholder="/address"
      isDark={$isDarkMode}
    />
    <TechInput
      label={$t("left_panel.args")}
      bind:value={$injectorArgs}
      placeholder="Val..."
      isDark={$isDarkMode}
    />

    <button
      on:click={() => sendOsc($injectorAddress, $injectorArgs)}
      title={$t("left_panel.send_tooltip", {
        values: {
          args: $injectorArgs || "...",
          address: $injectorAddress || "...",
        },
      })}
      class="h-8 w-full border-2 font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 mt-1 text-[10px]
      shadow-[2px_2px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none
      {$isDarkMode
        ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:border-slate-500'
        : 'bg-slate-800 border-slate-900 text-white hover:bg-slate-700'}"
    >
      <Send size={10} />
      {$t("left_panel.send")}
    </button>
  </div>
</div>
