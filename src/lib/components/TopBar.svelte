<script lang="ts">
  import { isDarkMode } from '$lib/stores/stores';
  import { hideWindow } from '$lib/bridge';
  import Server from '$lib/icons/Server.svelte';
  import Radio from '$lib/icons/Radio.svelte';
  import Sun from '$lib/icons/Sun.svelte';
  import Moon from '$lib/icons/Moon.svelte';
  import Settings from '$lib/icons/Settings.svelte';
  import X from '$lib/icons/X.svelte';
  import { isSettingsOpen } from '$lib/stores/stores';

  const toggleTheme = () => isDarkMode.update(n => !n);
</script>

<div data-tauri-drag-region class="h-8 flex items-center px-3 justify-between border-b-2 select-none shrink-0 {$isDarkMode ? 'bg-[#000000] border-slate-800' : 'bg-slate-800 border-slate-900'}">
  <div class="flex items-center gap-4 text-[10px] font-mono text-slate-400" data-tauri-drag-region>
    <div class="flex items-center gap-2 text-emerald-400" data-tauri-drag-region>
      <div class="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></div>
      <span class="font-bold tracking-wider">ONLINE</span>
    </div>
    <span class="opacity-30">|</span>
    <div class="flex items-center gap-1.5" data-tauri-drag-region>
      <Server size={10} />
      <span>0.0.0.0:7879</span>
    </div>
    <span class="opacity-30">|</span>
    <div class="flex items-center gap-1.5" data-tauri-drag-region>
      <Radio size={10} />
      <span>127.0.0.1:7878</span>
    </div>
  </div>
  <div class="flex items-center gap-3">
    <button 
      on:click={toggleTheme} 
      class="hover:text-amber-400 transition-colors {$isDarkMode ? 'text-slate-400' : 'text-slate-400'}"
      title="Toggle Night Vision"
    >
      {#if $isDarkMode}
        <Sun size={12} />
      {:else}
        <Moon size={12} />
      {/if}
    </button>

    <div class="w-px h-3 bg-slate-700"></div>

    <button on:click={() => isSettingsOpen.set(true)} class="text-slate-400 hover:text-white cursor-pointer transition-colors" title="Settings">
      <Settings size={12} />
    </button>
    <button on:click={hideWindow} class="text-slate-400 hover:text-rose-500 cursor-pointer" title="Close">
      <X size={12} />
    </button>
  </div>
</div>
