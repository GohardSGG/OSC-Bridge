<script lang="ts">
  import { t } from "svelte-i18n";
  import { onMount } from "svelte";
  import {
    isDarkMode,
    isSettingsOpen,
    isAlwaysOnTop,
  } from "$lib/stores/stores";
  import { hideWindow, setAlwaysOnTop, minimizeWindow } from "$lib/bridge";
  import { invoke } from "@tauri-apps/api/core";
  import Server from "$lib/icons/Server.svelte";
  import Radio from "$lib/icons/Radio.svelte";
  import Sun from "$lib/icons/Sun.svelte";
  import Moon from "$lib/icons/Moon.svelte";
  import Settings from "$lib/icons/Settings.svelte";
  import Minimize from "$lib/icons/Minimize.svelte";
  import X from "$lib/icons/X.svelte";
  import Pin from "$lib/icons/Pin.svelte";

  let listenPorts = "Loading...";
  let targetPorts = "Loading...";

  onMount(async () => {
    try {
      const ports: { listen: string; target: string } = await invoke(
        "get_formatted_ports",
      );
      listenPorts = ports.listen || "Not configured";
      targetPorts = ports.target || "Not configured";
    } catch (e) {
      console.error("Failed to get formatted ports:", e);
      listenPorts = "Error";
      targetPorts = "Error";
    }
  });

  const toggleTheme = () => isDarkMode.update((n) => !n);

  const toggleAlwaysOnTop = () => {
    isAlwaysOnTop.update((enabled) => {
      const newState = !enabled;
      setAlwaysOnTop(newState);
      return newState;
    });
  };
</script>

<div
  data-tauri-drag-region
  class="h-8 flex items-center px-3 justify-between border-b-2 select-none shrink-0 {$isDarkMode
    ? 'bg-[#000000] border-slate-800'
    : 'bg-slate-800 border-slate-900'}"
>
  <div
    class="flex items-center gap-4 text-[10px] font-mono text-slate-400"
    data-tauri-drag-region
  >
    <div
      class="flex items-center gap-2 text-emerald-400"
      data-tauri-drag-region
    >
      <div class="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></div>
      <span class="font-bold tracking-wider">{$t("topbar.online")}</span>
    </div>

    <!-- Listen Ports -->
    <span class="opacity-30">|</span>
    <div
      class="relative group flex items-center gap-1.5 min-w-0"
      data-tauri-drag-region
    >
      <Server size={10} class="shrink-0" />
      <span class="truncate max-w-[200px] cursor-help">{listenPorts}</span>
      <div
        class="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-max max-w-[300px] p-2 rounded border shadow-xl text-xs whitespace-pre-wrap leading-relaxed {$isDarkMode
          ? 'bg-slate-800 border-slate-700 text-slate-300'
          : 'bg-white border-slate-200 text-slate-600'}"
      >
        <div class="font-bold mb-1 opacity-50">
          {$t("topbar.listening_ports")}:
        </div>
        {listenPorts.split("|").join("\n")}
      </div>
    </div>

    <!-- Target Ports -->
    <span class="opacity-30">|</span>
    <div
      class="relative group flex items-center gap-1.5 min-w-0"
      data-tauri-drag-region
    >
      <Radio size={10} class="shrink-0" />
      <span class="truncate max-w-[200px] cursor-help">{targetPorts}</span>
      <div
        class="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-max max-w-[300px] p-2 rounded border shadow-xl text-xs whitespace-pre-wrap leading-relaxed {$isDarkMode
          ? 'bg-slate-800 border-slate-700 text-slate-300'
          : 'bg-white border-slate-200 text-slate-600'}"
      >
        <div class="font-bold mb-1 opacity-50">
          {$t("topbar.forwarding_targets")}:
        </div>
        {targetPorts.split("|").join("\n")}
      </div>
    </div>
  </div>

  <div class="flex items-center gap-3">
    <button
      on:click={toggleAlwaysOnTop}
      class="transition-colors {$isAlwaysOnTop
        ? 'text-emerald-400 hover:text-emerald-300'
        : 'text-slate-400 hover:text-white'}"
      title={$t("topbar.always_on_top")}
    >
      <Pin size={12} />
    </button>
    <button
      on:click={toggleTheme}
      class="hover:text-amber-400 transition-colors {$isDarkMode
        ? 'text-slate-400'
        : 'text-slate-400'}"
      title={$t("topbar.toggle_theme")}
    >
      {#if $isDarkMode}
        <Sun size={12} />
      {:else}
        <Moon size={12} />
      {/if}
    </button>

    <div class="w-px h-3 bg-slate-700"></div>

    <button
      on:click={() => isSettingsOpen.set(true)}
      class="text-slate-400 hover:text-white cursor-pointer transition-colors"
      title={$t("topbar.settings")}
    >
      <Settings size={12} />
    </button>
    <button
      on:click={minimizeWindow}
      class="text-slate-400 hover:text-white cursor-pointer transition-colors"
      title={$t("topbar.minimize") || "Minimize"}
    >
      <Minimize size={12} />
    </button>
    <button
      on:click={hideWindow}
      class="text-slate-400 hover:text-rose-500 cursor-pointer"
      title={$t("topbar.close")}
    >
      <X size={12} />
    </button>
  </div>
</div>
