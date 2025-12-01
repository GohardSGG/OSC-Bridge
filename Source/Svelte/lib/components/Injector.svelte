<script lang="ts">
  import { isDarkMode, injectorAddress, injectorArgs } from '$lib/stores/stores';
  import { sendOsc } from '$lib/bridge';
  import TechInput from './shared/TechInput.svelte';
  import Terminal from '$lib/icons/Terminal.svelte';
  import Send from '$lib/icons/Send.svelte';

  $: titleText = $isDarkMode ? 'text-slate-300' : 'text-slate-800';
</script>

<div class="p-3 border-b-2 {$isDarkMode ? 'bg-[#1e1e22] border-slate-800' : 'bg-white border-slate-200'}">
  <div class="mb-3">
    <h2 class="text-xs font-black flex items-center gap-2 uppercase tracking-wide {titleText}">
      <Terminal size={14} />
      Injector
    </h2>
  </div>
  <div class="space-y-2">
    <TechInput 
      label="Address" 
      bind:value={$injectorAddress}
      placeholder="/address"
      isDark={$isDarkMode}
    />
    <TechInput 
      label="Args" 
      bind:value={$injectorArgs}
      placeholder="Val..."
      isDark={$isDarkMode}
    />
    
    <button on:click={() => sendOsc($injectorAddress, $injectorArgs)} class="h-8 w-full border-2 font-bold uppercase tracking-widest active:translate-y-[1px] transition-all flex items-center justify-center gap-2 mt-1 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] text-[10px] {$isDarkMode ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' : 'bg-slate-800 border-slate-900 text-white hover:bg-slate-700'}">
      <Send size={10} />
      SEND
    </button>
  </div>
</div>
