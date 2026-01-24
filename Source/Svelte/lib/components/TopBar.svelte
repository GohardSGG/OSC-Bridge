<script lang="ts">
  import { t } from "svelte-i18n";
  import {
    isDarkMode,
    isSettingsOpen,
    isAlwaysOnTop,
    settingsListenPorts,
    settingsForwardTargets,
  } from "$lib/stores/stores";
  import { hideWindow, setAlwaysOnTop, minimizeWindow } from "$lib/bridge";

  // Components
  import StatPill from "./shared/StatPill.svelte";

  // Icons
  import Server from "$lib/icons/Server.svelte";
  import Radio from "$lib/icons/Radio.svelte";
  import Sun from "$lib/icons/Sun.svelte";
  import Moon from "$lib/icons/Moon.svelte";
  import Settings from "$lib/icons/Settings.svelte";
  import Minimize from "$lib/icons/Minimize.svelte";
  import X from "$lib/icons/X.svelte";
  import Pin from "$lib/icons/Pin.svelte";

  // Assets
  // @ts-ignore
  import appIcon from "../../assets/app-icon.png";

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
  class="h-8 flex items-center px-2 justify-between border-b-2 select-none shrink-0 relative z-40 {$isDarkMode
    ? 'bg-[#000000] border-slate-800'
    : 'bg-slate-800 border-slate-900'}"
>
  <!-- Left: Logo & Title -->
  <div class="flex items-center gap-2 w-[200px]" data-tauri-drag-region>
    <!-- Icon: Authentic App Icon -->
    <img src={appIcon} alt="Logo" class="w-6 h-6 object-contain" />

    <!-- Typographic Logo: Authentic KONTAKT MAX style -->
    <div
      class="font-bold text-lg tracking-tighter flex items-center gap-1 select-none text-white"
      data-tauri-drag-region
    >
      OSC<span class="font-light text-lg text-slate-400"> BRIDGE </span>
    </div>
  </div>

  <!-- Center: Stats Pills -->
  <div class="flex items-center gap-4 h-full" data-tauri-drag-region>
    <StatPill
      icon={Server}
      label="Listeners"
      count={$settingsListenPorts.length}
      items={$settingsListenPorts}
      colorClass="text-sky-400"
      borderColorClass="group-hover:border-sky-500/50"
    />

    <div class="w-px h-3 bg-slate-700/50"></div>

    <StatPill
      icon={Radio}
      label="Targets"
      count={$settingsForwardTargets.length}
      items={$settingsForwardTargets}
      colorClass="text-orange-400"
      borderColorClass="group-hover:border-orange-500/50"
    />
  </div>

  <!-- Right: Window Controls -->
  <div class="flex items-center gap-3 w-[180px] justify-end">
    <!-- Tools -->
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
      title={$t("topbar.minimize")}
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
