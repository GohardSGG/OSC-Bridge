<script lang="ts">
  import { 
    isDarkMode, 
    isSettingsOpen,
    settingsWsUrl,
    settingsListenPorts,
    settingsForwardTargets
  } from '$lib/stores/stores';
  import { saveConfiguration } from '$lib/bridge';
  import TechInput from './shared/TechInput.svelte';
  import Settings from '$lib/icons/Settings.svelte';
  import X from '$lib/icons/X.svelte';
  import Check from '$lib/icons/Check.svelte';
  import Server from '$lib/icons/Server.svelte';
  import Radio from '$lib/icons/Radio.svelte';
  import Send from '$lib/icons/Send.svelte';
  import Trash2 from '$lib/icons/Trash2.svelte';
  import Plus from '$lib/icons/Plus.svelte';

  // --- Theme Styles (Reactive) ---
  $: modalBg = $isDarkMode ? 'bg-[#18181b] border-slate-600' : 'bg-white border-slate-800';
  $: headerBg = $isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-800 text-white';
  $: contentBg = $isDarkMode ? 'bg-[#09090b]' : 'bg-[#f8fafc]';
  $: sectionTitle = $isDarkMode ? 'text-slate-500' : 'text-slate-400';
  $: divider = $isDarkMode ? 'bg-slate-800 border-slate-900' : 'bg-slate-200 border-white';
  $: footerBg = $isDarkMode ? 'bg-[#18181b] border-slate-800 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400';
  $: addBtn = $isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-800 border-slate-900 text-white hover:bg-slate-700';

  // --- Event Handlers ---
  const removePort = (idx: number) => {
    settingsListenPorts.update(ports => ports.filter((_, i) => i !== idx));
  };
  const addPort = () => {
    settingsListenPorts.update(ports => [...ports, ""]);
  };

  const removeTarget = (idx: number) => {
    settingsForwardTargets.update(targets => targets.filter((_, i) => i !== idx));
  };
  const addTarget = () => {
    settingsForwardTargets.update(targets => [...targets, ""]);
  };

</script>

{#if $isSettingsOpen}
<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
  <div class="w-[380px] border-2 shadow-[16px_16px_0px_rgba(0,0,0,0.3)] flex flex-col animate-in fade-in zoom-in-95 duration-100 {modalBg}">
    
    <!-- Modal Header -->
    <div class="h-10 flex items-center justify-between px-4 select-none {headerBg}">
      <div class="flex items-center gap-2">
        <Settings size={14} />
        <span class="text-xs font-bold uppercase tracking-widest">System Config</span>
      </div>
      <div class="flex items-center gap-3">
        <button on:click={saveConfiguration} class="hover:text-emerald-400 transition-colors"><Check size={16} strokeWidth={3} /></button>
        <div class="w-px h-4 {$isDarkMode ? 'bg-slate-700' : 'bg-slate-600'}"></div>
        <button on:click={() => isSettingsOpen.set(false)} class="hover:text-rose-400 transition-colors"><X size={16} strokeWidth={3} /></button>
      </div>
    </div>

    <!-- Modal Content -->
    <div class="p-5 space-y-4 overflow-y-auto max-h-[85vh] {contentBg}">
      
      <!-- Section: Connection -->
      <div>
         <h3 class="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2 {sectionTitle}">
            <Server size={12} /> WebSocket Host
         </h3>
         <TechInput bind:value={$settingsWsUrl} isDark={$isDarkMode} />
      </div>

      <div class="h-px border-b {divider}"></div>

      <!-- Section: Listen Ports -->
      <div>
         <h3 class="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 {sectionTitle}">
            <Radio size={12} /> Listening Ports
         </h3>
         <div class="space-y-2">
            {#each $settingsListenPorts as _, idx (idx)}
               <div class="flex gap-2">
                  <TechInput bind:value={$settingsListenPorts[idx]} className="flex-1" isDark={$isDarkMode} />
                  <button 
                    on:click={() => removePort(idx)}
                    class="w-8 h-8 border-2 flex items-center justify-center transition-colors {$isDarkMode ? 'bg-[#18181b] border-slate-700 text-slate-400 hover:text-rose-400' : 'bg-white border-slate-300 hover:text-rose-600'}"
                  >
                     <Trash2 size={14} />
                  </button>
               </div>
            {/each}
            <button 
               on:click={addPort}
               class="w-full h-8 mt-2 border-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider active:translate-y-[1px] shadow-sm transition-all {addBtn}"
            >
               <Plus size={12} strokeWidth={3} /> Add Port
            </button>
         </div>
      </div>

      <div class="h-px border-b {divider}"></div>

      <!-- Section: Forward Targets -->
      <div>
         <h3 class="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 {sectionTitle}">
            <Send size={12} /> Forwarding Targets
         </h3>
         <div class="space-y-2">
            {#each $settingsForwardTargets as _, idx (idx)}
               <div class="flex gap-2">
                  <TechInput bind:value={$settingsForwardTargets[idx]} className="flex-1" isDark={$isDarkMode} />
                  <button 
                     on:click={() => removeTarget(idx)}
                     class="w-8 h-8 border-2 flex items-center justify-center transition-colors {$isDarkMode ? 'bg-[#18181b] border-slate-700 text-slate-400 hover:text-rose-400' : 'bg-white border-slate-300 hover:text-rose-600'}"
                  >
                     <Trash2 size={14} />
                  </button>
               </div>
            {/each}
             <button 
               on:click={addTarget}
               class="w-full h-8 mt-2 border-2 border-dashed flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all {$isDarkMode ? 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-800'}"
            >
               <Plus size={12} /> Add Target
            </button>
         </div>
      </div>
    </div>

    <!-- Modal Footer -->
    <div class="h-6 border-t flex items-center px-4 justify-between text-[10px] font-mono {footerBg}">
       <span>CFG_VER: 2.1.0</span>
       <span>STATUS: EDITED</span>
    </div>
  </div>
</div>
{/if}
