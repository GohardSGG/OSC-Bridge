<script lang="ts">
  import { onMount } from 'svelte';
  import { isDarkMode } from '$lib/stores/stores';
  import { initializeBridge, loadInitialConfig } from '$lib/bridge';
  import TopBar from '$lib/components/TopBar.svelte';
  import LeftPanel from '$lib/components/LeftPanel.svelte';
  import RightPanel from '$lib/components/RightPanel.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  onMount(() => {
    initializeBridge();
    loadInitialConfig();
  });

  $: bgMain = $isDarkMode ? 'bg-[#09090b]' : 'bg-[#d4d4d8]';
  $: chassisBg = $isDarkMode ? 'bg-[#18181b]' : 'bg-[#f4f4f5]';
  $: chassisBorder = $isDarkMode ? 'border-slate-700' : 'border-slate-600';
  $: shadow = $isDarkMode ? 'shadow-[12px_12px_0px_rgba(0,0,0,0.5)]' : 'shadow-[12px_12px_0px_rgba(30,41,59,0.2)]';
</script>

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
