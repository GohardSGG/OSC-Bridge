<script lang="ts">
  import '$lib/i18n'; // Import to initialize i18n
  import { isLoading } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import { isDarkMode, uiScale } from '$lib/stores/stores';
  import { initializeBridge, loadInitialConfig } from '$lib/bridge';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftPanel from '$lib/components/LeftPanel.svelte';
  import RightPanel from '$lib/components/RightPanel.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  onMount(async () => {
    await loadInitialConfig();
    // Get the updated URL from the store after config load
    let wsUrl = 'ws://localhost:9122';
    // Access the store value directly (requires importing get if not using $ syntax in script)
    // Or simpler: rely on the store being updated by loadInitialConfig
    // We can't easily access the store value synchronously here without subscribing
    // But loadInitialConfig sets settingsWsUrl.
    
    // Let's pass the value directly from loadInitialConfig's side effect if possible?
    // Actually, loadInitialConfig updates the store. bridge.ts can read the store.
    initializeBridge(); 
  });

  // Reactive statement to apply UI scale
  $: if (typeof document !== 'undefined' && $uiScale) {
    document.documentElement.style.fontSize = `${16 * $uiScale}px`;
  }

  $: bgMain = $isDarkMode ? 'bg-[#09090b]' : 'bg-[#d4d4d8]';
  $: chassisBg = $isDarkMode ? 'bg-[#18181b]' : 'bg-[#f4f4f5]';
  $: chassisBorder = $isDarkMode ? 'border-slate-700' : 'border-slate-600';
  $: shadow = $isDarkMode ? 'shadow-[12px_12px_0px_rgba(0,0,0,0.5)]' : 'shadow-[12px_12px_0px_rgba(30,41,59,0.2)]';
</script>

{#if $isLoading}
  <div class="h-screen w-screen flex items-center justify-center bg-[#18181b] text-slate-500 font-mono text-xs">
    INITIALIZING...
  </div>
{:else}
<div class="h-screen w-screen font-sans flex items-center justify-center transition-colors duration-300 {bgMain} overflow-hidden">
  
  <SettingsModal />

  <div class="w-full h-full flex flex-col overflow-hidden transition-colors duration-300 {chassisBg} {chassisBorder} {shadow}">
    <TopBar />

    <div class="flex flex-1 overflow-hidden">
      <LeftPanel />
      <RightPanel />
    </div>
  </div>

</div>
{/if}
